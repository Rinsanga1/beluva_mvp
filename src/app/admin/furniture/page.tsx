"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { apiLogger } from '@/lib/logger';

type FurnitureItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  dimensions: string;
  material: string;
  tags: string[];
  image_urls: string[];
  stock_status: boolean;
  category: string;
  purchase_link: string;
};

export default function AdminFurniturePage() {
  const { user } = useAuth();
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<FurnitureItem | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    dimensions: '',
    material: '',
    tags: '',
    image_urls: '',
    stock_status: true,
    category: '',
    purchase_link: '',
  });

  // Fetch furniture items
  useEffect(() => {
    fetchFurniture();
  }, []);

  const fetchFurniture = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/furniture');
      
      if (!response.ok) {
        throw new Error('Failed to fetch furniture items');
      }
      
      const data = await response.json();
      setFurniture(data.data);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(data.data.map((item: FurnitureItem) => item.category)));
      setCategories(uniqueCategories as string[]);
    } catch (error: any) {
      console.error('Error fetching furniture:', error);
      setError(error.message || 'An error occurred while fetching furniture items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
  };

  const handleAddNew = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      dimensions: '',
      material: '',
      tags: '',
      image_urls: '',
      stock_status: true,
      category: '',
      purchase_link: '',
    });
    setShowAddModal(true);
  };

  const handleEdit = (item: FurnitureItem) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      dimensions: item.dimensions,
      material: item.material,
      tags: item.tags.join(', '),
      image_urls: item.image_urls.join(', '),
      stock_status: item.stock_status,
      category: item.category,
      purchase_link: item.purchase_link,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this furniture item?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/furniture/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete furniture item');
      }
      
      // Refresh the list
      fetchFurniture();
    } catch (error: any) {
      console.error('Error deleting furniture:', error);
      alert(error.message || 'An error occurred while deleting the furniture item');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formattedData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        dimensions: formData.dimensions,
        material: formData.material,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        image_urls: formData.image_urls.split(',').map(url => url.trim()).filter(Boolean),
        stock_status: formData.stock_status,
        category: formData.category,
        purchase_link: formData.purchase_link,
      };
      
      if (showAddModal) {
        // Add new item
        const response = await fetch('/api/furniture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to add furniture item');
        }
      } else if (showEditModal && currentItem) {
        // Edit existing item
        const response = await fetch(`/api/furniture/${currentItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: currentItem.id,
            ...formattedData,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update furniture item');
        }
      }
      
      // Close modal and refresh the list
      setShowAddModal(false);
      setShowEditModal(false);
      fetchFurniture();
    } catch (error: any) {
      console.error('Error saving furniture:', error);
      alert(error.message || 'An error occurred while saving the furniture item');
    }
  };

  // Filter furniture items based on search term and category
  const filteredFurniture = furniture.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Modal component
  const FurnitureFormModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-medium mb-4">
            {showAddModal ? 'Add New Furniture Item' : 'Edit Furniture Item'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                className="input w-full h-24"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="input w-full"
                  placeholder="e.g. sofa, table, chair"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                <input
                  type="text"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="e.g. 72W x 36D x 30H inches"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                <input
                  type="text"
                  name="material"
                  value={formData.material}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="e.g. Wood, Metal, Fabric"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="e.g. modern, wood, living room"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs (comma-separated)</label>
              <input
                type="text"
                name="image_urls"
                value={formData.image_urls}
                onChange={handleInputChange}
                required
                className="input w-full"
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Link</label>
              <input
                type="url"
                name="purchase_link"
                value={formData.purchase_link}
                onChange={handleInputChange}
                required
                className="input w-full"
                placeholder="https://example.com/product"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="stock_status"
                name="stock_status"
                checked={formData.stock_status}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="stock_status" className="ml-2 block text-sm text-gray-900">
                In Stock
              </label>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-xl font-medium">Furniture Management</h2>
          <button 
            className="btn btn-primary mt-4 md:mt-0"
            onClick={handleAddNew}
          >
            Add New Furniture
          </button>
        </div>
        
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <input
                type="text"
                placeholder="Search by name, description, or tags..."
                className="input w-full"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            <div>
              <select 
                className="input w-full"
                value={categoryFilter}
                onChange={handleCategoryChange}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {filteredFurniture.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No furniture items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || categoryFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding some furniture items.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFurniture.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden bg-white">
                <div className="relative h-48 w-full">
                  {item.image_urls && item.image_urls[0] ? (
                    <Image
                      src={item.image_urls[0]}
                      alt={item.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium truncate">{item.name}</h3>
                    <span className="font-medium text-gray-900">${item.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 h-12 overflow-hidden">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.stock_status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.stock_status ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <span className="ml-2 text-gray-500">{item.category}</span>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add/Edit Modals */}
      <FurnitureFormModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
      <FurnitureFormModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
      />
    </div>
  );
}