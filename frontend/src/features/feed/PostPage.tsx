import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../auth/useAuth";
import { getPost, getReactionEmojis } from "./api";
import { PostCard } from "./PostCard";
import type { Post } from "./types";

/** A single post, opened from a notification (with its comments for a comment). */
export function PostPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [missing, setMissing] = useState(false);
  const [emojis, setEmojis] = useState<string[]>([]);

  useEffect(() => {
    getReactionEmojis().then(setEmojis).catch(() => {});
  }, []);

  useEffect(() => {
    const postId = Number(id);
    setPost(null);
    setMissing(false);
    if (!Number.isInteger(postId) || postId <= 0) {
      setMissing(true);
      return;
    }
    getPost(postId).then(setPost).catch(() => setMissing(true));
  }, [id]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/" className="flex items-center gap-1 self-start text-sm text-text-muted press hover:text-text">
        <Icon name="chevronLeft" size={16} /> Fil
      </Link>
      {missing ? (
        <p className="card p-6 text-center text-text-muted">Ce post n'existe plus.</p>
      ) : post ? (
        <PostCard
          key={`${post.id}-${params.get("comments") ?? ""}-${params.get("comment") ?? ""}`} // another notification of the same post starts fresh
          post={post}
          currentUserId={user?.id}
          emojis={emojis}
          onChanged={setPost}
          onDeleted={() => navigate("/")}
          initialShowComments={params.get("comments") === "1"}
          highlightCommentId={Number(params.get("comment")) || null}
        />
      ) : (
        <Skeleton className="h-64" />
      )}
    </div>
  );
}
