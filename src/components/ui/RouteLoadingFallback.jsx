import React from "react";
import { TopProgressBar } from "./TopProgressBar";
import { PostCardSkeleton } from "./PostCardSkeleton";

export function RouteLoadingFallback() {
  return (
    <div className="route-loading-fallback" style={{ width: "100%" }}>
      <TopProgressBar />
      <PostCardSkeleton count={3} />
    </div>
  );
}
