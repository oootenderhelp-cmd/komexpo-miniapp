import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, File, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  label?: string;
  preview?: boolean;
}

export default function FileUpload({
  onUpload,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  label = "Загрузить файл",
  preview = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Validate file size
    if (file.size > maxSize) {
      toast.error(`Файл слишком большой. Максимум ${maxSize / 1024 / 1024}MB`);
      return;
    }

    // Validate file type
    if (accept && !file.type.match(accept.replace("*", ".*"))) {
      toast.error("Неподдерживаемый тип файла");
      return;
    }

    setFileName(file.name);
    onUpload(file);

    // Generate preview if it's an image
    if (preview && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      {previewUrl && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed border-primary/20">
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={() => {
              setPreviewUrl(null);
              setFileName(null);
            }}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
        }`}
      >
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isDragging ? "bg-primary/20" : "bg-muted"
            }`}>
              <Upload className={`w-6 h-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium text-sm">Перетащите файл сюда</p>
              <p className="text-xs text-muted-foreground">или нажмите для выбора</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Максимум {maxSize / 1024 / 1024}MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4"
          >
            {label}
          </Button>
        </CardContent>
      </Card>

      {/* File Info */}
      {fileName && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <File className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm truncate">{fileName}</span>
        </div>
      )}
    </div>
  );
}
