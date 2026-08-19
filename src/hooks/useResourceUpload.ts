"use client";
import { useState, useCallback } from "react";
import { uploadKnowledge, addKnowledgeLink, pollAssetStatus } from "@/lib/api";

/** Accepted file extensions for upload */
export const ACCEPTED_FILE_TYPES = ".pdf,.pptx,.docx,.txt,.md";
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

export interface UploadedResource {
  id: string;
  name: string;
  assetId: string;
  status: "uploading" | "processing" | "ready" | "failed";
}

/**
 * Shared hook for uploading files and links across all components.
 * Handles file upload to knowledge, link ingestion, and status polling.
 */
export function useResourceUpload(folderId?: string) {
  const [resources, setResources] = useState<UploadedResource[]>([]);

  /**
   * Upload a file: sends to the knowledge API, then polls until ready.
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadedResource | null> => {
      if (!folderId) {
        console.error("[useResourceUpload] No folderId provided");
        return null;
      }

      // Validate file extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "pptx", "docx", "txt", "md"].includes(ext)) {
        console.error(`[useResourceUpload] Unsupported file type: .${ext}`);
        return null;
      }

      const tempId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const resource: UploadedResource = {
        id: tempId,
        name: file.name,
        assetId: "",
        status: "uploading",
      };

      setResources((prev) => [...prev, resource]);

      try {
        const knowledgeItem = await uploadKnowledge(folderId, file);
        const assetId = knowledgeItem.assetId;

        // Update with real assetId and switch to processing
        setResources((prev) =>
          prev.map((r) =>
            r.id === tempId ? { ...r, assetId, status: "processing" } : r
          )
        );

        // Poll until ready or failed
        const finalStatus = await pollAssetStatus(assetId, (status) => {
          setResources((prev) =>
            prev.map((r) =>
              r.id === tempId
                ? { ...r, status: status as UploadedResource["status"] }
                : r
            )
          );
        });

        setResources((prev) =>
          prev.map((r) =>
            r.id === tempId ? { ...r, status: finalStatus } : r
          )
        );

        return { ...resource, assetId, status: finalStatus };
      } catch (err) {
        console.error("[useResourceUpload] Upload failed:", err);
        setResources((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, status: "failed" } : r))
        );
        return null;
      }
    },
    [folderId]
  );

  /**
   * Ingest a URL (web page or YouTube): sends to knowledge API, then polls.
   */
  const uploadLink = useCallback(
    async (url: string): Promise<UploadedResource | null> => {
      if (!folderId) {
        console.error("[useResourceUpload] No folderId provided");
        return null;
      }

      // Generate a display name from the URL
      let displayName = url;
      try {
        const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
        displayName = parsed.hostname + parsed.pathname;
        if (displayName.length > 40) displayName = displayName.slice(0, 40) + "...";
      } catch {}

      const tempId = `link-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const resource: UploadedResource = {
        id: tempId,
        name: `Link: ${displayName}`,
        assetId: "",
        status: "uploading",
      };

      setResources((prev) => [...prev, resource]);

      try {
        const knowledgeItem = await addKnowledgeLink(folderId, url, displayName);
        const assetId = knowledgeItem.assetId;

        setResources((prev) =>
          prev.map((r) =>
            r.id === tempId ? { ...r, assetId, status: "processing" } : r
          )
        );

        const finalStatus = await pollAssetStatus(assetId, (status) => {
          setResources((prev) =>
            prev.map((r) =>
              r.id === tempId
                ? { ...r, status: status as UploadedResource["status"] }
                : r
            )
          );
        });

        setResources((prev) =>
          prev.map((r) =>
            r.id === tempId ? { ...r, status: finalStatus } : r
          )
        );

        return { ...resource, assetId, status: finalStatus };
      } catch (err) {
        console.error("[useResourceUpload] Link ingestion failed:", err);
        setResources((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, status: "failed" } : r))
        );
        return null;
      }
    },
    [folderId]
  );

  const removeResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const isAnyProcessing = resources.some(
    (r) => r.status === "uploading" || r.status === "processing"
  );

  const readyAssetIds = resources
    .filter((r) => r.status === "ready" && r.assetId)
    .map((r) => r.assetId);

  return {
    resources,
    uploadFile,
    uploadLink,
    removeResource,
    isAnyProcessing,
    readyAssetIds,
  };
}
