"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react"; // Using iconify for Lucide icons

export default function DesignSystem() {
  const [activeTab, setActiveTab] = useState("overview");
  
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-sans selection:bg-[#FEF2F2] selection:text-[#D7191F]">
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --brand-red: #D7191F;
          --brand-red-hover: #B91419;
          --brand-red-tint: #FEF2F2;
          
          --bg-app: #FAFAFA;
          --bg-card: #FFFFFF;
          
          --text-primary: #0A0A0A;
          --text-secondary: #52525B;
          --text-tertiary: #A1A1AA;
          
          --border: #E4E4E7;
          
          --success: #16A34A;
          --warning: #D97706;
          --danger: #DC2626;
          --info: #2563EB;
          
          --radius-input: 8px;
          --radius-card: 12px;
          --radius-modal: 16px;
          --radius-pill: 999px;
          
          --shadow-card: 0 1px 2px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.06);
          --shadow-popover: 0 8px 24px rgba(0,0,0,.08);
          --shadow-modal: 0 24px 64px rgba(0,0,0,.18);
          --shadow-glow: 0 8px 20px rgba(215,25,31,.25);
        }
      `}} />
      
      {/* Header */}
      <header className="h-[56px] bg-white/80 backdrop-blur border-b border-[#E4E4E7] flex items-center px-6 sticky top-0 z-50">
        <h1 className="text-[16px] font-semibold tracking-tight">Design System</h1>
      </header>
      
      <main className="max-w-[1280px] mx-auto p-8 space-y-16">
        
        {/* Colors */}
        <section>
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#0A0A0A]">Color Tokens</h2>
            <p className="text-[14px] text-[#52525B] mt-1">Exact color mappings per the design direction.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <div className="h-16 rounded-[8px] bg-[#D7191F] shadow-[0_8px_20px_rgba(215,25,31,.25)]"></div>
              <div className="text-[13px] font-medium">Brand Red</div>
              <div className="text-[12px] text-[#A1A1AA]">#D7191F</div>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-[8px] bg-[#B91419]"></div>
              <div className="text-[13px] font-medium">Red Hover</div>
              <div className="text-[12px] text-[#A1A1AA]">#B91419</div>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-[8px] bg-[#FEF2F2] border border-[#E4E4E7]"></div>
              <div className="text-[13px] font-medium">Red Tint</div>
              <div className="text-[12px] text-[#A1A1AA]">#FEF2F2</div>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-[8px] bg-[#0A0A0A]"></div>
              <div className="text-[13px] font-medium">Text Primary</div>
              <div className="text-[12px] text-[#A1A1AA]">#0A0A0A</div>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-[8px] bg-[#52525B]"></div>
              <div className="text-[13px] font-medium">Text Secondary</div>
              <div className="text-[12px] text-[#A1A1AA]">#52525B</div>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-[8px] bg-[#E4E4E7]"></div>
              <div className="text-[13px] font-medium">Border</div>
              <div className="text-[12px] text-[#A1A1AA]">#E4E4E7</div>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#0A0A0A]">Buttons</h2>
            <p className="text-[14px] text-[#52525B] mt-1">Height 40px (default), 8px radius. Primary gets glow.</p>
          </div>
          
          <div className="flex flex-wrap gap-6 items-end bg-[#FFFFFF] p-8 rounded-[12px] border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,.04),0_1px_3px_rgba(0,0,0,.06)]">
            <div className="space-y-3">
              <div className="text-[12px] text-[#A1A1AA] font-medium uppercase tracking-wider">Primary</div>
              <button className="h-[40px] px-4 bg-[#D7191F] text-white text-[14px] font-medium rounded-[8px] shadow-[0_8px_20px_rgba(215,25,31,.25)] hover:bg-[#B91419] hover:translate-y-[-1px] transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[#D7191F]/30 focus-visible:ring-offset-2">
                Save Changes
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-[12px] text-[#A1A1AA] font-medium uppercase tracking-wider">Secondary</div>
              <button className="h-[40px] px-4 bg-[#FFFFFF] border border-[#E4E4E7] text-[#0A0A0A] text-[14px] font-medium rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:bg-[#FAFAFA] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#E4E4E7] focus-visible:ring-offset-1">
                Save Draft
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-[12px] text-[#A1A1AA] font-medium uppercase tracking-wider">Ghost</div>
              <button className="h-[40px] px-4 bg-transparent text-[#52525B] text-[14px] font-medium rounded-[8px] hover:bg-[#F4F4F5] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#E4E4E7]">
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-[12px] text-[#A1A1AA] font-medium uppercase tracking-wider">With Icon</div>
              <button className="h-[40px] px-4 bg-[#FFFFFF] border border-[#E4E4E7] text-[#0A0A0A] text-[14px] font-medium rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:bg-[#FAFAFA] transition-all outline-none flex items-center gap-2">
                <Icon icon="lucide:plus" className="w-[16px] h-[16px] text-[#52525B]" />
                Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-[12px] text-[#A1A1AA] font-medium uppercase tracking-wider">Disabled</div>
              <button disabled className="h-[40px] px-4 bg-[#F4F4F5] text-[#A1A1AA] text-[14px] font-medium rounded-[8px] cursor-not-allowed">
                Publishing...
              </button>
            </div>
          </div>
        </section>

        {/* Inputs */}
        <section>
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#0A0A0A]">Inputs & Forms</h2>
            <p className="text-[14px] text-[#52525B] mt-1">40px height, 1px border. Focus ring in red at 20% opacity + red border.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#FFFFFF] p-8 rounded-[12px] border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,.04),0_1px_3px_rgba(0,0,0,.06)]">
            
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#0A0A0A]">Product Name</label>
              <input 
                type="text" 
                placeholder="iPhone 18 Pro" 
                className="w-full h-[40px] px-3 bg-[#FFFFFF] border border-[#E4E4E7] rounded-[8px] text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A1A1AA] hover:border-[#D4D4D8] focus:border-[#D7191F] focus:ring-[3px] focus:ring-[#D7191F]/20"
              />
              <p className="text-[12px] text-[#52525B]">Used as the main title across the store.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#0A0A0A]">Searchable Select</label>
              <div className="relative">
                <input 
                  type="text" 
                  value="Published" 
                  readOnly
                  className="w-full h-[40px] pl-3 pr-9 bg-[#FFFFFF] border border-[#E4E4E7] rounded-[8px] text-[14px] text-[#0A0A0A] outline-none cursor-pointer hover:border-[#D4D4D8] focus:border-[#D7191F] focus:ring-[3px] focus:ring-[#D7191F]/20"
                />
                <Icon icon="lucide:chevrons-up-down" className="w-[16px] h-[16px] text-[#A1A1AA] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[13px] font-medium text-[#0A0A0A]">Media Dropzone</label>
              <div className="border border-dashed border-[#E4E4E7] rounded-[8px] bg-[#FAFAFA] p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F4F4F5] hover:border-[#D4D4D8] transition-all">
                <div className="w-[40px] h-[40px] bg-[#FFFFFF] border border-[#E4E4E7] rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,.04)] flex items-center justify-center mb-3">
                  <Icon icon="lucide:upload-cloud" className="w-[18px] h-[18px] text-[#52525B]" />
                </div>
                <div className="text-[14px] font-medium text-[#0A0A0A]">Drag images or browse</div>
                <div className="text-[12px] text-[#52525B] mt-1">PNG, JPG up to 5MB</div>
              </div>
            </div>

          </div>
        </section>

        {/* Status Badges */}
        <section>
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#0A0A0A]">Status Badges</h2>
            <p className="text-[14px] text-[#52525B] mt-1">Soft tinted bg + colored dot.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 bg-[#FFFFFF] p-8 rounded-[12px] border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,.04),0_1px_3px_rgba(0,0,0,.06)]">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-100 rounded-[999px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></div>
              <span className="text-[12px] font-medium text-green-700 leading-none">Published</span>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-[999px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></div>
              <span className="text-[12px] font-medium text-amber-700 leading-none">Scheduled</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-50 border border-[#E4E4E7] rounded-[999px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#52525B]"></div>
              <span className="text-[12px] font-medium text-[#52525B] leading-none">Draft</span>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-100 rounded-[999px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></div>
              <span className="text-[12px] font-medium text-red-700 leading-none">Error</span>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
