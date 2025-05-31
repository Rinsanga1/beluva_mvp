"use client";

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function RoomUploader() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setErrorMessage(null);
    
    if (selectedFile) {
      // Basic client-side validation
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
        setErrorMessage('Please select a JPG, PNG, or WEBP image');
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrorMessage('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      
      // Create preview
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Set file input value to match the dropped file
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        fileInputRef.current.files = dataTransfer.files;
      }
      
      // Trigger the same validation and preview logic
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(droppedFile.type)) {
        setErrorMessage('Please select a JPG, PNG, or WEBP image');
        return;
      }
      
      if (droppedFile.size > 10 * 1024 * 1024) {
        setErrorMessage('File size must be less than 10MB');
        return;
      }
      
      setFile(droppedFile);
      setErrorMessage(null);
      
      // Create preview
      const objectUrl = URL.createObjectURL(droppedFile);
      setPreview(objectUrl);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const uploadImage = async () => {
    if (!file || !user) return;
    
    setUploadStatus('uploading');
    setErrorMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-room-image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to upload image');
      }
      
      setUploadStatus('success');
      setUploadedImageId(data.data.id);
    } catch (error: any) {
      setUploadStatus('error');
      setErrorMessage(error.message || 'An error occurred during upload');
    }
  };

  const handleContinue = () => {
    if (uploadedImageId) {
      router.push(`/recommendations?imageId=${uploadedImageId}`);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setUploadStatus('idle');
    setErrorMessage(null);
    setUploadedImageId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Upload a Room Image</h2>
      <p className="text-gray-600 mb-6">
        Upload an image of your room to get AI-powered furniture recommendations.
        We support JPG, PNG, and WEBP formats up to 10MB.
      </p>
      
      {uploadStatus === 'success' ? (
        <div className="text-center py-4">
          <div className="flex items-center justify-center mb-4">
            <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Successful!</h3>
          <p className="text-gray-600 mb-4">Your room image has been uploaded successfully.</p>
          
          <div className="my-6 relative w-full max-w-md mx-auto h-64 rounded-lg overflow-hidden">
            {preview && (
              <Image 
                src={preview} 
                alt="Uploaded room" 
                fill 
                style={{ objectFit: 'cover' }} 
                sizes="(max-width: 768px) 100vw, 500px"
              />
            )}
          </div>
          
          <div className="flex space-x-4 justify-center">
            <button
              onClick={resetUpload}
              className="btn btn-outline"
            >
              Upload Another Image
            </button>
            <button
              onClick={handleContinue}
              className="btn btn-primary"
            >
              Continue to Recommendations
            </button>
          </div>
        </div>
      ) : (
        <>
          <div 
            className={`border-2 border-dashed rounded-lg p-12 text-center ${
              errorMessage ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-primary-500'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {preview ? (
              <div className="relative w-full h-64">
                <Image 
                  src={preview} 
                  alt="Room preview" 
                  fill 
                  style={{ objectFit: 'contain' }} 
                  sizes="(max-width: 768px) 100vw, 500px"
                />
                <button 
                  onClick={resetUpload}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                >
                  <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4 flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500">
                    <span>Upload a file</span>
                    <input 
                      id="file-upload" 
                      name="file" 
                      type="file" 
                      className="sr-only" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp" 
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">JPG, PNG, WEBP up to 10MB</p>
              </div>
            )}
          </div>
          
          {errorMessage && (
            <div className="mt-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}
          
          <div className="mt-6">
            <button 
              type="button" 
              className="btn btn-primary w-full sm:w-auto"
              disabled={!file || uploadStatus === 'uploading'}
              onClick={uploadImage}
            >
              {uploadStatus === 'uploading' ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload & Get Recommendations'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}