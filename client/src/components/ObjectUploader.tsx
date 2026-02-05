import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/queryClient";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onComplete?: (result: { url: string }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxFileSize = 10485760,
  allowedFileTypes,
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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();
      onComplete?.({ url });
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
