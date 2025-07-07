import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  currentImageUrl?: string;
  placeholder: string;
  className?: string;
  circular?: boolean;
}

const FileUpload = ({ onFileSelect, currentImageUrl, placeholder, className = "", circular = false }: FileUploadProps) => {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);

  useEffect(() => {
    setPreview((prev) => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return currentImageUrl || null;
    });
  }, [currentImageUrl]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1
  });

  const removeImage = () => {
    setPreview(null);
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed border-gray-300 hover:border-gray-400 
          transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100
          ${circular ? 'rounded-full aspect-square' : 'rounded-lg'}
          ${isDragActive ? 'border-primary bg-primary/10' : ''}
          ${preview ? 'p-2' : 'p-6'}
          flex items-center justify-center
        `}
      >
        <input {...getInputProps()} />
        
        {preview ? (
          <div className={`relative ${circular ? 'rounded-full overflow-hidden' : 'rounded'} w-full h-full`}>
            <img
              src={preview}
              alt="Preview"
              className={`w-full h-full object-cover ${circular ? 'rounded-full' : 'rounded'}`}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">{placeholder}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;