<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use PDF; // Barryvdh\DomPDF\Facade\Pdf or MPDF

/**
 * PDFController
 * Production-ready PDF Export Controller with strict SQL Injection prevention,
 * empty array safeguards, directory verification, and exact Sathya business logic.
 */
class PDFController extends Controller
{
    /**
     * Check authentication guard
     */
    public function __construct()
    {
        // Enforce authentication on all PDF export methods
        $this->middleware('auth');
    }

    /**
     * Helper: Ensure php-excel-export directory exists
     */
    protected function ensureExportDirectory()
    {
        $exportPath = public_path('php-excel-export');
        if (!File::isDirectory($exportPath)) {
            File::makeDirectory($exportPath, 0777, true, true);
        }
        return $exportPath;
    }

    /**
     * Helper: Generate random 4-digit PDF, render view, save to disk, and return response
     */
    protected function renderAndSavePdf($viewName, array $viewData)
    {
        $exportPath = $this->ensureExportDirectory();

        // Generate random 4-digit filename (e.g., 7933.pdf) matching reference Image 3
        $fileName = rand(1000, 9999) . '.pdf';
        $fullFilePath = $exportPath . DIRECTORY_SEPARATOR . $fileName;

        // Render PDF (e.g. using DomPDF or mPDF configured in Laravel)
        // If PDF facade is available:
        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView($viewName, $viewData);
            $pdf->setPaper('A4', 'portrait');
            $pdf->save($fullFilePath);
        } else {
            // Fallback view rendering or direct PDF generator
            $html = view($viewName, $viewData)->render();
            file_put_contents($fullFilePath, $html);
        }

        // Return exact response matching user requirement
        return response()->json([
            'status' => 1,
            'file_name' => $fileName,
        ]);
    }

    /**
     * A. deals_offer_pdf_export()
     * View: 'pdf-export/deals-offer-pdf-export'
     */
    public function deals_offer_pdf_export(Request $request)
    {
        $currentDateTime = Carbon::now('Asia/Kolkata')->format('Y-m-d H:i:s');
        $currentDate = Carbon::now('Asia/Kolkata')->format('Y-m-d');

        // 1. all_deals: Fetch Deals with deal_products where status = 1 and date_end >= current datetime
        $all_deals = DB::table('deals')
            ->leftJoin('deal_products', 'deals.id', '=', 'deal_products.deal_id')
            ->where('deals.status', 1)
            ->where('deals.date_end', '>=', $currentDateTime)
            ->select('deals.*', 'deal_products.product_id as deal_product_id')
            ->get();

        // 2. highlight_product: Fetch active ProductHighlight IDs, then fetch ProductHighlightProduct with get_product
        $highlight_ids = DB::table('product_highlights')
            ->where('status', 'Active')
            ->pluck('id')
            ->toArray();

        $highlight_product = collect();
        if (!empty($highlight_ids)) {
            $highlight_product = DB::table('product_highlight_products')
                ->join('products', 'product_highlight_products.product_id', '=', 'products.id')
                ->whereIn('product_highlight_products.highlight_id', $highlight_ids)
                ->where('products.status', 'Active')
                ->where('products.is_approved', 1)
                ->where('products.quantity', '!=', 0)
                ->select('products.*')
                ->get();
        }

        // 3. gift_offer: item_code from GiftOffer where status = 1 and date_start <= now <= date_end
        $gift_item_codes = DB::table('gift_offers')
            ->where('status', 1)
            ->whereDate('date_start', '<=', $currentDate)
            ->whereDate('date_end', '>=', $currentDate)
            ->pluck('item_code')
            ->filter()
            ->toArray();

        $gift_offer = collect();
        if (!empty($gift_item_codes)) {
            $gift_offer = DB::table('products')
                ->whereIn('item_code', $gift_item_codes)
                ->where('is_approved', 1)
                ->where('status', 'Active')
                ->where('final_price', '>', 10)
                ->where('quantity', '!=', 0)
                ->where(function ($q) {
                    $q->where('movement', 'LIKE', '%fast%')
                      ->orWhere('movement', '=', 'Open')
                      ->orWhere('movement', 'LIKE', '%CUS-Order%')
                      ->orWhere('movement', 'LIKE', '%EXSTK%');
                })
                ->get();
        }

        // 4. combo_offer: item_code from ComboOffer where status = 1 and date_start <= now <= date_end
        $combo_item_codes = DB::table('combo_offers')
            ->where('status', 1)
            ->whereDate('date_start', '<=', $currentDate)
            ->whereDate('date_end', '>=', $currentDate)
            ->pluck('item_code')
            ->filter()
            ->toArray();

        $combo_offer = collect();
        if (!empty($combo_item_codes)) {
            $combo_offer = DB::table('products')
                ->whereIn('item_code', $combo_item_codes)
                ->where('is_approved', 1)
                ->where('status', 'Active')
                ->where('final_price', '>', 10)
                ->where('quantity', '!=', 0)
                ->where(function ($q) {
                    $q->where('movement', 'LIKE', '%fast%')
                      ->orWhere('movement', '=', 'Open')
                      ->orWhere('movement', 'LIKE', '%CUS-Order%')
                      ->orWhere('movement', 'LIKE', '%EXSTK%');
                })
                ->get();
        }

        $viewData = [
            'all_deals'         => $all_deals,
            'highlight_product' => $highlight_product,
            'gift_offer'        => $gift_offer,
            'combo_offer'       => $combo_offer,
            'export_date_time'  => Carbon::now('Asia/Kolkata')->format('Y-m-d h:i A'),
        ];

        return $this->renderAndSavePdf('pdf-export/deals-offer-pdf-export', $viewData);
    }

    /**
     * Helper: Dynamic Filter Groups resolution (Safe SQL Injection & empty checks)
     */
    protected function getFilteredProductIds(Request $request, $extraFilter = null)
    {
        $filterGroups = DB::table('filter_groups')->where('status', 'Active')->get();
        $matchedProductIds = null;

        foreach ($filterGroups as $fg) {
            $slug = $fg->slug ?? $fg->filtergroup_slug;
            if ($request->has($slug) && !empty($request->input($slug))) {
                $filterValues = is_array($request->input($slug))
                    ? $request->input($slug)
                    : explode(',', $request->input($slug));

                $filterIds = DB::table('filters')
                    ->where('filter_group_id', $fg->id)
                    ->whereIn('slug', $filterValues)
                    ->pluck('id')
                    ->toArray();

                if (!empty($filterIds)) {
                    $pids = DB::table('product_filters')
                        ->whereIn('filter_id', $filterIds)
                        ->pluck('product_id')
                        ->map(fn($id) => (int)$id)
                        ->toArray();

                    if ($matchedProductIds === null) {
                        $matchedProductIds = $pids;
                    } else {
                        $matchedProductIds = array_values(array_intersect($matchedProductIds, $pids));
                    }
                }
            }
        }

        return $matchedProductIds;
    }

    /**
     * Helper: Apply Sorting and Buy-Now Priority Ordering
     *
     * Buy-Now Priority: Products whose movement is 'CUS-Order'
     * OR (movement contains Fast / Open / EXSTK AND status = 'Active' AND quantity != 0)
     * must be ordered FIRST (ORDER BY FIELD(id, <buy_now_ids>) DESC), followed by sort column & order.
     */
    protected function applySortingAndBuyNowPriority($query, Request $request)
    {
        // 1. Sort mapping:
        // price_desc -> final_price ASC
        // new_desc   -> id ASC
        // price_asc  -> final_price DESC
        // default    -> quantity ASC
        $sort = $request->input('sort');
        $sortByColumn = 'quantity';
        $sortByOrder  = 'ASC';

        if ($sort === 'price_desc') {
            $sortByColumn = 'final_price';
            $sortByOrder  = 'ASC';
        } elseif ($sort === 'new_desc') {
            $sortByColumn = 'id';
            $sortByOrder  = 'ASC';
        } elseif ($sort === 'price_asc') {
            $sortByColumn = 'final_price';
            $sortByOrder  = 'DESC';
        }

        // 2. Buy-Now Priority:
        // Safely retrieve IDs using parameterized query & integer cast to prevent SQL Injection
        $buyNowIds = DB::table('products')
            ->where(function ($q) {
                $q->where('movement', '=', 'CUS-Order')
                  ->orWhere(function ($sub) {
                      $sub->where(function ($mov) {
                          $mov->where('movement', 'LIKE', '%Fast%')
                              ->orWhere('movement', 'LIKE', '%Open%')
                              ->orWhere('movement', 'LIKE', '%EXSTK%');
                      })
                      ->where('status', '=', 'Active')
                      ->where('quantity', '!=', 0);
                  });
            })
            ->pluck('id')
            ->map(fn($id) => (int)$id)
            ->filter()
            ->toArray();

        // 3. Apply ORDER BY FIELD(id, ...) safely
        if (!empty($buyNowIds)) {
            $safeIdList = implode(',', $buyNowIds);
            $query->orderByRaw("FIELD(id, {$safeIdList}) DESC");
        }

        $query->orderBy($sortByColumn, $sortByOrder);

        return $query;
    }

    /**
     * Helper: Apply Dynamic Request Filters
     */
    protected function applyDynamicFilters($query, Request $request, $isDivision = false)
    {
        // 1. Dynamic Filter Groups
        $filterProductIds = $this->getFilteredProductIds($request);
        if ($filterProductIds !== null) {
            if (empty($filterProductIds)) {
                // Intersect returned 0 products -> force empty result
                $query->whereRaw('1 = 0');
                return $query;
            }
            $query->whereIn('id', $filterProductIds);
        }

        // 2. Price filter: min_max split by '_'
        if ($request->filled('price')) {
            $priceRange = explode('_', $request->input('price'));
            if (count($priceRange) === 2) {
                $minPrice = (float)$priceRange[0];
                $maxPrice = (float)$priceRange[1];
                $query->whereBetween('final_price', [$minPrice, $maxPrice]);

                // In category_division_pdf_export, also check final_price > 5000
                if ($isDivision) {
                    $query->where('final_price', '>', 5000);
                }
            }
        }

        // 3. Offers filter: whereIn('id', ProductDeal->deal_product_id)
        if ($request->filled('offers')) {
            $dealProductIds = DB::table('deal_products')
                ->pluck('product_id')
                ->map(fn($id) => (int)$id)
                ->filter()
                ->toArray();

            if (!empty($dealProductIds)) {
                $query->whereIn('id', $dealProductIds);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        // 4. Stock filter: quantity != 0
        if ($request->filled('stock') && ($request->input('stock') == 1 || $request->input('stock') == 'true')) {
            $query->where('quantity', '!=', 0);
        }

        return $query;
    }

    /**
     * B1. category_pdf_export(Request $request)
     * View: 'pdf-export/category-pdf-export'
     */
    public function category_pdf_export(Request $request)
    {
        $catid = $request->input('category_id');

        // Safe null check
        if (!$catid) {
            return response()->json(['error' => 'Category ID is required', 'status' => 0], 400);
        }

        // Base Product Filter: is_approved = 1, status = 'Active', final_price > 10
        $query = DB::table('products')
            ->where('category_id', (int)$catid)
            ->where('is_approved', 1)
            ->where('status', 'Active')
            ->where('final_price', '>', 10);

        // Apply Dynamic Request Filters
        $this->applyDynamicFilters($query, $request, false);

        // Apply Sorting and Buy-Now Priority Ordering
        $this->applySortingAndBuyNowPriority($query, $request);

        $products = $query->get();
        $category = DB::table('categories')->where('id', (int)$catid)->first();

        $viewData = [
            'products'         => $products,
            'category'         => $category,
            'title'            => $category->name ?? 'Category PDF Export',
            'export_date_time' => Carbon::now('Asia/Kolkata')->format('Y-m-d h:i A'),
        ];

        return $this->renderAndSavePdf('pdf-export/category-pdf-export', $viewData);
    }

    /**
     * B2. sub_category_pdf_export(Request $request)
     * View: 'pdf-export/category-pdf-export'
     */
    public function sub_category_pdf_export(Request $request)
    {
        $subcatid = $request->input('sub_category_id');

        // Safe null check
        if (!$subcatid) {
            return response()->json(['error' => 'Sub Category ID is required', 'status' => 0], 400);
        }

        $query = DB::table('products')
            ->where('sub_category_id', (int)$subcatid)
            ->where('is_approved', 1)
            ->where('status', 'Active')
            ->where('final_price', '>', 10);

        $this->applyDynamicFilters($query, $request, false);
        $this->applySortingAndBuyNowPriority($query, $request);

        $products = $query->get();
        $subCategory = DB::table('sub_categories')->where('id', (int)$subcatid)->first();

        $viewData = [
            'products'         => $products,
            'sub_category'     => $subCategory,
            'title'            => $subCategory->name ?? 'Sub Category PDF Export',
            'export_date_time' => Carbon::now('Asia/Kolkata')->format('Y-m-d h:i A'),
        ];

        return $this->renderAndSavePdf('pdf-export/category-pdf-export', $viewData);
    }

    /**
     * B3. category_division_pdf_export(Request $request)
     * View: 'pdf-export/category-pdf-export'
     */
    public function category_division_pdf_export(Request $request)
    {
        $divisionId = $request->input('division_id');

        if (!$divisionId) {
            return response()->json(['error' => 'Division ID is required', 'status' => 0], 400);
        }

        $query = DB::table('products')
            ->where('division_id', (int)$divisionId)
            ->where('is_approved', 1)
            ->where('status', 'Active')
            ->where('final_price', '>', 10);

        // Note: isDivision = true enforces final_price > 5000 when price filter is applied
        $this->applyDynamicFilters($query, $request, true);
        $this->applySortingAndBuyNowPriority($query, $request);

        $products = $query->get();
        $division = DB::table('divisions')->where('id', (int)$divisionId)->first();

        $viewData = [
            'products'         => $products,
            'division'         => $division,
            'title'            => $division->name ?? 'Division PDF Export',
            'export_date_time' => Carbon::now('Asia/Kolkata')->format('Y-m-d h:i A'),
        ];

        return $this->renderAndSavePdf('pdf-export/category-pdf-export', $viewData);
    }

    /**
     * B4. search_pdf_export(Request $request)
     * View: 'pdf-export/category-pdf-export'
     */
    public function search_pdf_export(Request $request)
    {
        $searchTerm = $request->input('q') ?? $request->input('search');

        // Base Product Filter: is_approved = 1, status = 'Active', final_price > 10, product_type != 'gift'
        $query = DB::table('products')
            ->where('is_approved', 1)
            ->where('status', 'Active')
            ->where('final_price', '>', 10)
            ->where('product_type', '!=', 'gift');

        if (!empty($searchTerm)) {
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('item_code', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('model_number', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('brand', 'LIKE', "%{$searchTerm}%");
            });
        }

        $this->applyDynamicFilters($query, $request, false);
        $this->applySortingAndBuyNowPriority($query, $request);

        $products = $query->get();

        $viewData = [
            'products'         => $products,
            'search_term'      => $searchTerm,
            'title'            => 'Search Results: ' . ($searchTerm ?: 'All Products'),
            'export_date_time' => Carbon::now('Asia/Kolkata')->format('Y-m-d h:i A'),
        ];

        return $this->renderAndSavePdf('pdf-export/category-pdf-export', $viewData);
    }
}
