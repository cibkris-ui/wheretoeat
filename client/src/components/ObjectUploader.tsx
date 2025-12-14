import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxFileSize = 10485760,
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxFileSize) {
      alert(`Le fichier est trop volumineux. Maximum: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    setUploading(true);
    try {
      const { url } = await onGetUploadParameters();
      
      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (response.ok) {
        onComplete?.({ successful: [{ uploadURL: url.split("?")[0] }] });
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erreur lors du téléchargement");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const accept = allowedFileTypes?.join(",") || undefined;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button 
        type="button" 
        onClick={handleClick}
        className={buttonClassName}
        variant="outline"
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Téléchargement...
          </>
        ) : (
          children
        )}
      </Button>
    </div>
  );
}
