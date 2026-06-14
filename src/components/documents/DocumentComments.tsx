import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
    AtSign,
    Check,
    CheckCircle2,
    CornerDownRight,
    Edit3,
    MessageSquare,
    MoreHorizontal,
    Pin,
    RotateCcw,
    Send,
    Trash2
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  updatedAt?: string;
  parentId?: string | null;
  replies?: Comment[];
  isResolved?: boolean;
  isPinned?: boolean;
  mentions?: string[]; // user IDs
}

interface DocumentCommentsProps {
  comments: Comment[];
  currentUser: User;
  users: User[]; // For @mentions
  onAddComment?: (content: string, parentId?: string, mentions?: string[]) => void;
  onReply?: (parentId: string, content: string, mentions?: string[]) => void;
  onResolve?: (commentId: string, resolved: boolean) => void;
  onPin?: (commentId: string, pinned: boolean) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  className?: string;
}

function parseMentions(text: string, users: User[]): { content: React.ReactNode[]; mentionedIds: string[] } {
  const mentionedIds: string[] = [];
  const parts = text.split(/(@\w+(?:\s\w+)?)/g);
  
  const content = parts.map((part, index) => {
    if (part.startsWith("@")) {
      const name = part.slice(1).trim();
      const user = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
      if (user) {
        mentionedIds.push(user.id);
        return (
          <span
            key={index}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-sm"
          >
            <AtSign className="w-3 h-3" />
            {user.name}
          </span>
        );
      }
    }
    return <span key={index}>{part}</span>;
  });

  return { content, mentionedIds };
}

interface CommentItemProps {
  comment: Comment;
  currentUser: User;
  users: User[];
  level: number;
  onReply: (parentId: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  onPin: (commentId: string, pinned: boolean) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  replyToId: string | null;
  editId: string | null;
  replyContent: string;
  editContent: string;
  onReplyChange: (value: string) => void;
  onEditChange: (value: string) => void;
  onSubmitReply: () => void;
  onSubmitEdit: () => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onStartReply: (commentId: string) => void;
  onStartEdit: (commentId: string, content: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUser,
  users,
  level,
  onResolve,
  onPin,
  onDelete,
  replyToId,
  editId,
  replyContent,
  editContent,
  onReplyChange,
  onEditChange,
  onSubmitReply,
  onSubmitEdit,
  onCancelReply,
  onCancelEdit,
  onStartReply,
  onStartEdit,
}) => {
  const { t } = useTranslation();
  const isReplying = replyToId === comment.id;
  const isEditing = editId === comment.id;
  const isAuthor = comment.author.id === currentUser.id;
  const { content } = parseMentions(comment.content, users);

  return (
    <div className={cn("group", level > 0 && "ms-8 mt-3")}>
      <div
        className={cn(
          "flex gap-3 p-3 rounded-lg transition-colors",
          comment.isPinned && "bg-amber-50/50 border border-amber-100",
          comment.isResolved && "opacity-60 bg-muted/30",
          !comment.isPinned && !comment.isResolved && "hover:bg-muted/30"
        )}
      >
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={comment.author.avatar} />
          <AvatarFallback className="text-xs bg-[#0B1C3E] text-white">
            {comment.author.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
            {comment.updatedAt && (
              <span className="text-xs text-muted-foreground">
                (edited{" "}
                {formatDistanceToNow(new Date(comment.updatedAt), {
                  addSuffix: true,
                })}
                )
              </span>
            )}
            {comment.isPinned && (
              <Badge
                variant="outline"
                className="text-xs bg-amber-100 text-amber-700 border-amber-200 gap-1"
              >
                <Pin className="w-3 h-3" />
                Pinned
              </Badge>
            )}
            {comment.isResolved && (
              <Badge
                variant="outline"
                className="text-xs bg-green-100 text-green-700 border-green-200 gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Resolved
              </Badge>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => onEditChange(e.target.value)}
                className="min-h-[80px] text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
                  onClick={onSubmitEdit}
                  disabled={!editContent.trim()}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 text-foreground/90 leading-relaxed">
              {content}
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onStartReply(comment.id)}
              >
                <CornerDownRight className="w-3.5 h-3.5 me-1" />
                Reply
              </Button>
              {!comment.parentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onResolve(comment.id, !comment.isResolved)}
                >
                  {comment.isResolved ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 me-1" />
                      Unresolve
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 me-1" />
                      Resolve
                    </>
                  )}
                </Button>
              )}
              {(isAuthor || comment.author.id === currentUser.id) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      aria-label={t('accessibility.comment_options', 'Comment options')}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!comment.parentId && (
                      <DropdownMenuItem
                        onClick={() => onPin(comment.id, !comment.isPinned)}
                      >
                        <Pin className="w-4 h-4 me-2" />
                        {comment.isPinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                    )}
                    {isAuthor && (
                      <DropdownMenuItem
                        onClick={() => onStartEdit(comment.id, comment.content)}
                      >
                        <Edit3 className="w-4 h-4 me-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="w-4 h-4 me-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Reply Input */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="text-[10px] bg-[#0B1C3E] text-white">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => onReplyChange(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px] text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={onCancelReply}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
                    onClick={onSubmitReply}
                    disabled={!replyContent.trim()}
                  >
                    <Send className="w-3.5 h-3.5 me-1.5" />
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              users={users}
              level={level + 1}
              onReply={onStartReply}
              onResolve={onResolve}
              onPin={onPin}
              onEdit={onStartEdit}
              onDelete={onDelete}
              replyToId={replyToId}
              editId={editId}
              replyContent={replyContent}
              editContent={editContent}
              onReplyChange={onReplyChange}
              onEditChange={onEditChange}
              onSubmitReply={onSubmitReply}
              onSubmitEdit={onSubmitEdit}
              onCancelReply={onCancelReply}
              onCancelEdit={onCancelEdit}
              onStartReply={onStartReply}
              onStartEdit={onStartEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function DocumentComments({
  comments,
  currentUser,
  users,
  onAddComment,
  onReply,
  onResolve,
  onPin,
  onEdit,
  onDelete,
  className,
}: DocumentCommentsProps) {
  const { t } = useTranslation();
  const [newComment, setNewComment] = React.useState("");
  const [replyToId, setReplyToId] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState("");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const [showMentions, setShowMentions] = React.useState(false);
  const [mentionSearch, setMentionSearch] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [_cursorPosition, _setCursorPosition] = React.useState(0);

  // Build nested comment structure
  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const roots: Comment[] = [];

    // First pass: create map
    flatComments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree
    flatComments.forEach((comment) => {
      const node = commentMap.get(comment.id)!;
      if (comment.parentId && commentMap.has(comment.parentId)) {
        const parent = commentMap.get(comment.parentId)!;
        parent.replies = parent.replies || [];
        parent.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort: pinned first, then by date
    const sortComments = (items: Comment[]) => {
      items.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      items.forEach((item) => {
        if (item.replies) sortComments(item.replies);
      });
    };
    sortComments(roots);

    return roots;
  };

  const commentTree = React.useMemo(
    () => buildCommentTree(comments),
    [comments]
  );

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleTextChange = (value: string, isReply: boolean = false) => {
    if (isReply) {
      setReplyContent(value);
    } else {
      setNewComment(value);
    }

    // Check for @ mention
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      setMentionSearch("");
    } else if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!afterAt.includes(" ")) {
        setShowMentions(true);
        setMentionSearch(afterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: User) => {
    const currentValue = replyToId ? replyContent : newComment;
    const lastAtIndex = currentValue.lastIndexOf("@");
    const beforeAt = currentValue.slice(0, lastAtIndex);
    const newValue = `${beforeAt}@${user.name} `;

    if (replyToId) {
      setReplyContent(newValue);
    } else {
      setNewComment(newValue);
    }
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    const { mentionedIds } = parseMentions(newComment, users);
    onAddComment?.(newComment, undefined, mentionedIds);
    setNewComment("");
  };

  const handleSubmitReply = () => {
    if (!replyContent.trim() || !replyToId) return;
    const { mentionedIds } = parseMentions(replyContent, users);
    onReply?.(replyToId, replyContent, mentionedIds);
    setReplyContent("");
    setReplyToId(null);
  };

  const handleSubmitEdit = () => {
    if (!editContent.trim() || !editId) return;
    onEdit?.(editId, editContent);
    setEditContent("");
    setEditId(null);
  };

  const resolvedCount = comments.filter((c) => c.isResolved && !c.parentId).length;
  const pinnedCount = comments.filter((c) => c.isPinned && !c.parentId).length;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Comments</h3>
          <Badge variant="secondary">{comments.length}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {resolvedCount > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              {resolvedCount} resolved
            </span>
          )}
          {pinnedCount > 0 && (
            <span className="flex items-center gap-1">
              <Pin className="w-3.5 h-3.5 text-amber-500" />
              {pinnedCount} pinned
            </span>
          )}
        </div>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 p-4">
        {comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No comments yet"
            description="Start a discussion by adding the first comment."
            className="py-12"
          />
        ) : (
          <div className="space-y-2">
            {commentTree.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                users={users}
                level={0}
                onReply={(parentId) => {
                  setReplyToId(parentId);
                  setReplyContent("");
                }}
                onResolve={onResolve || (() => {})}
                onPin={onPin || (() => {})}
                onEdit={onEdit || (() => {})}
                onDelete={onDelete || (() => {})}
                replyToId={replyToId}
                editId={editId}
                replyContent={replyContent}
                editContent={editContent}
                onReplyChange={setReplyContent}
                onEditChange={setEditContent}
                onSubmitReply={handleSubmitReply}
                onSubmitEdit={handleSubmitEdit}
                onCancelReply={() => {
                  setReplyToId(null);
                  setReplyContent("");
                }}
                onCancelEdit={() => {
                  setEditId(null);
                  setEditContent("");
                }}
                onStartReply={(id) => {
                  setReplyToId(id);
                  setReplyContent("");
                  setEditId(null);
                }}
                onStartEdit={(id, content) => {
                  setEditId(id);
                  setEditContent(content);
                  setReplyToId(null);
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* New Comment Input */}
      <div className="p-4 border-t bg-muted/20">
        <div className="flex gap-3">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="text-xs bg-[#0B1C3E] text-white">
              {currentUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Popover open={showMentions} onOpenChange={setShowMentions}>
              <PopoverTrigger asChild>
                <div>
                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Add a comment... Use @ to mention someone"
                    className="min-h-[80px] resize-none pe-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleSubmitComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-2 end-2 h-8 w-8 bg-[#0B1C3E] hover:bg-[#1a3a6e]"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    aria-label={t('accessibility.send_comment', 'Send comment')}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {filteredUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          onSelect={() => insertMention(user)}
                          className="flex items-center gap-2"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1.5">
              Press Cmd+Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
