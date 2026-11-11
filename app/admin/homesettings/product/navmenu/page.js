// app/admin/category/product-category/page.js
"use client";

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ProductCategoryPage() {
  const [categories, setCategories] = useState([]);
  const [originalCategories, setOriginalCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categoryproduct/nav');
      
      if (!response.ok) {
        throw new Error('Failed to fetch category products');
      }
      
      const data = await response.json();
      
      // Filter only active categories and sort by position
      const activeCategories = data
        .filter(cat => cat.status === "Active")
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      setCategories(activeCategories);
      console.log("Fetched categories:", activeCategories);
      setOriginalCategories(JSON.parse(JSON.stringify(activeCategories)));
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching category products:", error);
      alert("Failed to load category products");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update positions in the local state
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }));
    
    setCategories(updatedItems);
    setHasChanges(true);
  };

  const saveCategoryOrder = async () => {
    try {
      setSaving(true);
      setShowConfirmModal(false);
      
      // Create the data to send to the API
      const updatePromises = categories.map((category, index) => 
        fetch('/api/categoryproduct/nav', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subcategoryId: category.subcategoryId,
            products: category.products || [],
            borderColor: category.borderColor || "#000000",
            alignment: category.alignment || "left",
            status: category.status || "Active",
            position: index,
            bannerRedirectUrl: category.bannerRedirectUrl || "",
            categoryRedirectUrl: category.categoryRedirectUrl || "",
            bannerImage: category.bannerImage || "",
            categoryImage: category.categoryImage || ""
          })
        })
      );
      
      await Promise.all(updatePromises);
      
      // Update the original categories to match the current order
      setOriginalCategories(JSON.parse(JSON.stringify(categories)));
      setHasChanges(false);
      
   
      
      // Refresh to make sure we have the latest data
      fetchCategories();
    } catch (error) {
      console.error("Error saving category order:", error);
      alert("Failed to save category order: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetOrder = () => {
    setCategories(JSON.parse(JSON.stringify(originalCategories)));
    setHasChanges(false);
  };

  const openConfirmModal = () => {
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>Product Category Management</h1>
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading categories...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', marginBottom: '10px' }}>Product Category Management</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Drag and drop to reorder product categories. Changes will be saved when you click "Save Order".
      </p>
      
      {categories.length === 0 ? (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          backgroundColor: '#f9f9f9', 
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          No active product categories found.
        </div>
      ) : (
        <>
          <div style={{ margin: '20px 0', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    style={{ backgroundColor: '#f9f9f9' }}
                  >
                    {categories.map((category, index) => (
                      <Draggable 
                        key={category._id} 
                        draggableId={category._id} 
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              padding: '15px',
                              background: 'white',
                              borderBottom: '1px solid #eee',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'background-color 0.2s',
                              ...provided.draggableProps.style
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                backgroundColor: '#f0f0f0', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {index + 1}
                              </span>
                              <div>
                                <div style={{ fontWeight: '500' }}>
                                  {/* FIXED: Get category name from subcategoryId object */}
                                  {category.subcategoryId?.category_name || 'Unknown Category'}
                                </div>
                                <div style={{ fontSize: '0.8em', color: '#666' }}>
                                  {category.products?.length || 0} products
                                </div>
                              </div>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.8em', 
                                fontWeight: '500',
                                backgroundColor: '#e8f5e9',
                                color: '#2e7d32'
                              }}>
                                Active
                              </span>
                            </div>
                            <div style={{ color: '#888', fontSize: '0.9em' }}>
                              Position: {category.position}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button 
              onClick={openConfirmModal}
              disabled={saving || !hasChanges}
              style={{
                padding: '10px 15px',
                border: 'none',
                borderRadius: '4px',
                cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                backgroundColor: (saving || !hasChanges) ? '#ccc' : '#4caf50',
                color: 'white'
              }}
            >
              {saving ? 'Saving...' : 'Save Order'}
            </button>
            
            <button 
              onClick={resetOrder}
              disabled={!hasChanges}
              style={{
                padding: '10px 15px',
                border: 'none',
                borderRadius: '4px',
                cursor: !hasChanges ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                backgroundColor: !hasChanges ? '#ccc' : '#ff9800',
                color: 'white'
              }}
            >
              Reset
            </button>
            
            <button 
              onClick={fetchCategories}
              style={{
                padding: '10px 15px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                backgroundColor: '#2196f3',
                color: 'white'
              }}
            >
              Refresh
            </button>
          </div>
          
          {hasChanges && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#fff8e1', 
              border: '1px solid #ffd54f',
              borderRadius: '4px'
            }}>
              You have unsaved changes. Click "Save Order" to save them.
            </div>
          )}
        </>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '90%',
            maxWidth: '400px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Confirm Save</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>Are you sure you want to save the changes?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeConfirmModal}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer'
                }}
              >
                No
              </button>
              <button
                onClick={saveCategoryOrder}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}