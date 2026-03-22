"use client";

import { useState } from "react";

type WrongNoteImageProps = {
  src: string;
  alt: string;
  variant: "card" | "detail";
  studentCanReupload?: boolean;
  className?: string;
};

export function WrongNoteImage({ src, alt, variant, studentCanReupload = false, className = "" }: WrongNoteImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = failedSrc === src;

  if (hasError) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-slate-100 px-4 text-center ${
          variant === "detail" ? "min-h-[18rem]" : "min-h-[12rem]"
        } ${className}`}
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">이미지 파일을 찾을 수 없습니다</p>
          <p className="text-xs leading-5 text-slate-500">{studentCanReupload ? "학생 화면에서 이미지를 다시 업로드해 주세요." : "저장된 이미지가 현재 경로에서 확인되지 않습니다."}</p>
        </div>
      </div>
    );
  }

  return (
    // next/image does not fit this ownership-guarded API URL because the browser must send the current auth cookies.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        setFailedSrc(src);
      }}
    />
  );
}
