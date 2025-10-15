"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Trophy,
  TrendingUp,
  Layers,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";
import {
  deckRepo,
  cardRepo,
  type DeckResponse,
} from "@/lib/client/repositories";
import type { Card } from "@/lib/types/cards";

type Deck = DeckResponse;
type DeckLevel = "simple" | "mid" | "expert";

const DECK_LEVEL_OPTIONS: DeckLevel[] = ["simple", "mid", "expert"];

function normalizeDeckLevel(value: string): DeckLevel {
  return DECK_LEVEL_OPTIONS.includes(value as DeckLevel)
    ? (value as DeckLevel)
    : "simple";
}

interface DeckStats {
  lastStudyDate: string | null;
  totalSessions: number;
  totalCardsReviewed: number;
  performanceGrade: string | null;
  successRate: number | null;
  reviewCount: number;
}

export default function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardModal, setCardModal] = useState<
    { mode: "create" | "edit"; card?: Card }
  | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [deckDeleting, setDeckDeleting] = useState(false);
  const [similarDecks, setSimilarDecks] = useState<any[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showCards, setShowCards] = useState(false);
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [cardPerformance, setCardPerformance] = useState<
    Record<
      string,
      {
        difficulty: "easy" | "medium" | "hard" | "unreviewed";
        successRate: number;
        recentReviews: Array<"again" | "hard" | "good" | "easy">;
      }
    >
  >({});

  const toggleStar = async () => {
    if (!deck) return;

    try {
      const data = await deckRepo.star(deck.id);
      setDeck({ ...deck, starred: data.deck.starred });
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  };

  const fetchDeck = useCallback(async () => {
    try {
      const [deckData, statsData, perfData] = await Promise.all([
        deckRepo.getById(resolvedParams.id).catch((err) => {
          if (err.status === 401) {
            const returnUrl = encodeURIComponent(`/decks/${resolvedParams.id}`);
            router.push(`/login?returnUrl=${returnUrl}`);
            return null;
          }
          throw err;
        }),
        deckRepo.getStats(resolvedParams.id).catch(() => null),
        deckRepo.getCardPerformance(resolvedParams.id).catch(() => null),
      ]);

      if (deckData) {
        setDeck(deckData.deck);
        setCards(deckData.cards || []);
      }

      if (statsData) {
        setStats(statsData.stats);
      }

      if (perfData) {
        setCardPerformance(perfData.cardPerformance || {});
      }
    } catch (error) {
      console.error("Error fetching deck:", error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  const fetchSimilarDecks = useCallback(async () => {
    try {
      const data = await deckRepo.getSimilar(resolvedParams.id);
      setSimilarDecks(data.decks || []);
    } catch (error) {
      console.error("Error fetching similar decks:", error);
    }
  }, [resolvedParams.id]);

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (!window.confirm("Delete this card? This action cannot be undone.")) {
        return;
      }

      setDeleteLoadingId(cardId);
      try {
        await cardRepo.deleteCard(cardId);
        await fetchDeck();
      } catch (error) {
        console.error("Error deleting card:", error);
      } finally {
        setDeleteLoadingId(null);
      }
    },
    [fetchDeck],
  );

  const handleDeckDelete = useCallback(async () => {
    if (!deck) return;

    if (!window.confirm("Delete this deck? All cards will be removed.")) {
      return;
    }

    setDeckDeleting(true);
    try {
      await deckRepo.deleteDeck(deck.id);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting deck:", error);
    } finally {
      setDeckDeleting(false);
    }
  }, [deck, router]);

  useEffect(() => {
    fetchDeck();
    fetchSimilarDecks();
  }, [fetchDeck, fetchSimilarDecks]);

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) return "Just now";
    if (diffMinutes < 60)
      return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    if (diffWeeks < 4)
      return `${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ago`;
    if (diffMonths < 12)
      return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
    return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
        return "text-green-600";
      case "A":
        return "text-green-500";
      case "B":
        return "text-blue-500";
      case "C":
        return "text-yellow-500";
      case "D":
        return "text-orange-500";
      case "F":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const startStudySession = () => {
    router.push(`/study/${resolvedParams.id}?limit=10`);
  };

  const startQuizSession = () => {
    router.push(`/quiz/${resolvedParams.id}?limit=10`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-accent flex items-center justify-center">
          <p className="text-gray-600">Loading deck...</p>
        </div>
      </AppLayout>
    );
  }

  if (!deck) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-accent flex items-center justify-center">
          <p className="text-gray-600">Deck not found</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          className={`card mb-8 relative ${deck.starred ? "bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 legendary-border" : ""}`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <h1 className="text-3xl font-bold text-primary mb-2">
                  {deck.title}
                </h1>
                <button
                  onClick={toggleStar}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    deck.starred
                      ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100"
                      : "text-gray-400 hover:text-yellow-500 hover:bg-gray-100"
                  }`}
                  aria-label={deck.starred ? "Unstar deck" : "Star deck"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 20 20"
                    fill={deck.starred ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={deck.starred ? 0 : 1.5}
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              </div>
              {deck.description && (
                <p className="text-gray-600 mb-4">{deck.description}</p>
              )}
              {/* Study Statistics */}
              <div className="flex flex-wrap gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Cards</p>
                    <p className="text-sm font-medium">{cards.length}</p>
                  </div>
                </div>

                {stats && (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Last studied</p>
                        <p className="text-sm font-medium">
                          {formatRelativeTime(stats.lastStudyDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Sessions</p>
                        <p className="text-sm font-medium">
                          {stats.totalSessions}
                        </p>
                      </div>
                    </div>

                    {stats.performanceGrade && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Performance</p>
                          <p
                            className={`text-sm font-bold ${getGradeColor(stats.performanceGrade)}`}
                          >
                            Grade {stats.performanceGrade}
                            {stats.successRate !== null && (
                              <span className="text-xs font-normal text-gray-500 ml-1">
                                ({stats.successRate}%)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {!stats.performanceGrade && stats.reviewCount > 0 && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Performance</p>
                          <p className="text-sm text-gray-400">
                            {10 - stats.reviewCount} more reviews needed
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 ml-4">
              <button
                onClick={() => setDeckModalOpen(true)}
                className="px-3 py-2 text-sm rounded-md border border-gray-200 text-primary hover:bg-gray-50 transition-colors"
              >
                Edit Deck
              </button>
              <button
                onClick={handleDeckDelete}
                className="px-3 py-2 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                disabled={deckDeleting}
              >
                {deckDeleting ? "Deleting..." : "Delete Deck"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={startStudySession}
            className="btn-primary text-lg px-8 py-3"
            disabled={cards.length === 0}
          >
            Start Study Session
          </button>
          <button
            onClick={startQuizSession}
            className="btn-secondary text-lg px-8 py-3"
            disabled={cards.length === 0}
          >
            Start Quiz Mode
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="card text-center py-12">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No cards yet
            </h3>
            <p className="text-gray-600 mb-4">
              Add cards to start studying this deck
            </p>
            <button
              onClick={() => setCardModal({ mode: "create" })}
              className="btn-secondary"
            >
              Add Your First Card
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-primary">
                  Cards ({cards.length})
                </h2>
                <button
                  onClick={() => setShowCards(!showCards)}
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  {showCards ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setCardModal({ mode: "create" })}
                className="btn-secondary"
              >
                Add Card
              </button>
            </div>
            {showCards ? (
              <div className="grid gap-[1px] md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card, index) => {
                  const perf = cardPerformance[card.id];

                  return (
                    <div
                      key={card.id}
                      className={`card group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-indigo-500 hover:card-hover-gradient hover:z-10 relative ${
                        index % 2 === 0 ? "hover:rotate-1" : "hover:-rotate-1"
                      } ${card.advancedNotes || card.mnemonics ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (card.advancedNotes || card.mnemonics) {
                          const newExpanded = new Set(expandedCards);
                          if (newExpanded.has(card.id)) {
                            newExpanded.delete(card.id);
                          } else {
                            newExpanded.add(card.id);
                          }
                          setExpandedCards(newExpanded);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div>
                            <p className="text-primary font-medium mt-1">
                              {card.front}
                            </p>
                            <div className="text-gray-600 mt-2">
                              <span className="md:blur-[3px] md:group-hover:blur-none transition-all duration-200">
                                {card.back || ""}
                              </span>
                              {(card.advancedNotes || card.mnemonics) && (
                                <span className="inline-flex items-center gap-0.5 ml-2 text-sm text-indigo-600 align-middle">
                                  <span className="text-xs">
                                    {expandedCards.has(card.id)
                                      ? "Less"
                                      : "More"}
                                  </span>
                                  {expandedCards.has(card.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </span>
                              )}
                            </div>
                            {card.advancedNotes &&
                              expandedCards.has(card.id) && (
                                <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                                  <p className="text-gray-700 whitespace-pre-wrap">
                                    {card.advancedNotes}
                                  </p>
                                </div>
                              )}
                            {card.mnemonics &&
                              expandedCards.has(card.id) && (
                                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-amber-600 font-medium text-sm">
                                      🧠 Memory Aid
                                    </span>
                                  </div>
                                  <p className="text-gray-700 whitespace-pre-wrap">
                                    {card.mnemonics}
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setCardModal({ mode: "edit", card });
                              }}
                              className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteCard(card.id);
                              }}
                              className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={deleteLoadingId === card.id}
                            >
                              {deleteLoadingId === card.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Performance indicator icon */}
                      {perf && perf.recentReviews.length > 0 && (
                        <div className="absolute bottom-3 right-3">
                          {perf.difficulty === "easy" ? (
                            <Tooltip
                              content={`Easy - ${Math.round(perf.successRate * 100)}% success rate`}
                            >
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            </Tooltip>
                          ) : perf.difficulty === "medium" ? (
                            <Tooltip
                              content={`Medium - ${Math.round(perf.successRate * 100)}% success rate`}
                            >
                              <AlertCircle className="w-5 h-5 text-yellow-500" />
                            </Tooltip>
                          ) : perf.difficulty === "hard" ? (
                            <Tooltip
                              content={`Hard - ${Math.round(perf.successRate * 100)}% success rate`}
                            >
                              <XCircle className="w-5 h-5 text-red-500" />
                            </Tooltip>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative h-96 overflow-hidden rounded-lg">
                <div className="grid gap-[1px] md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 27 }, (_, i) => i).map((i) => (
                    <div key={i} className="card opacity-60">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => setShowCards(true)}
                    className="btn-glass px-6 py-3"
                  >
                    Show the cards
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Similar Decks Section */}
        {similarDecks.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-primary mb-4">
              Similar Decks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarDecks.map((deck) => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-semibold text-primary mb-2">
                    {deck.title}
                  </h3>
                  {deck.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {deck.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {deck.level}
                    </span>
                    <span>
                      {Math.round((deck.similarity || 0) * 100)}% match
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {deck && deckModalOpen && (
          <DeckFormModal
            deck={deck}
            onClose={() => setDeckModalOpen(false)}
            onSuccess={async () => {
              await fetchDeck();
              setDeckModalOpen(false);
            }}
          />
        )}
        {cardModal && (
          <CardFormModal
            deckId={resolvedParams.id}
            mode={cardModal.mode}
            card={cardModal.card}
            onClose={() => setCardModal(null)}
            onSuccess={async () => {
              await fetchDeck();
              setCardModal(null);
            }}
          />
        )}
      </main>
    </AppLayout>
  );
}

interface DeckFormModalProps {
  deck: Deck;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

function DeckFormModal({ deck, onClose, onSuccess }: DeckFormModalProps) {
  const [title, setTitle] = useState(deck.title);
  const [description, setDescription] = useState(deck.description ?? "");
  const [level, setLevel] = useState<DeckLevel>(normalizeDeckLevel(deck.level));
  const [language, setLanguage] = useState(deck.language ?? "en");
  const [isPublic, setIsPublic] = useState(deck.isPublic);
  const [tagsInput, setTagsInput] = useState(deck.tags?.join(", ") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(deck.title);
    setDescription(deck.description ?? "");
    setLevel(normalizeDeckLevel(deck.level));
    setLanguage(deck.language ?? "en");
    setIsPublic(deck.isPublic);
    setTagsInput(deck.tags?.join(", ") ?? "");
  }, [deck]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedTitle = title.trim();
      if (!normalizedTitle) {
        throw new Error("Title is required");
      }

      const normalizedDescription = description.trim();
      const normalizedLanguage = language.trim() || deck.language || "en";
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await deckRepo.update(deck.id, {
        title: normalizedTitle,
        description: normalizedDescription || null,
        level,
        language: normalizedLanguage,
        isPublic,
        tags,
      });

      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-primary mb-4">Chỉnh sửa bộ thẻ</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="deck-title" className="label">
              Tiêu đề
            </label>
            <input
              id="deck-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="input"
              placeholder="Tên bộ thẻ"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="deck-description" className="label">
              Mô tả
            </label>
            <textarea
              id="deck-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="input h-28 resize-none"
              placeholder="Mô tả ngắn gọn về bộ thẻ"
              disabled={loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="deck-level" className="label">
                Độ khó
              </label>
              <select
                id="deck-level"
                value={level}
                onChange={(event) => setLevel(event.target.value as DeckLevel)}
                className="input"
                disabled={loading}
              >
                {DECK_LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="deck-language" className="label">
                Ngôn ngữ
              </label>
              <input
                id="deck-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="input"
                placeholder="Ví dụ: en, vi"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="deck-tags" className="label">
              Thẻ (ngăn cách bằng dấu phẩy)
            </label>
            <input
              id="deck-tags"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              className="input"
              placeholder="ví dụ: biology, exam"
              disabled={loading}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              disabled={loading}
            />
            <span>Công khai bộ thẻ này</span>
          </label>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
              disabled={loading}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CardFormModalProps {
  deckId: string;
  mode: "create" | "edit";
  card?: Card;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

function resolveBackValue(card?: Card): string {
  if (!card) return "";
  if ("back" in card && typeof card.back === "string") {
    return card.back;
  }
  return "";
}

function CardFormModal({
  deckId,
  mode,
  card,
  onClose,
  onSuccess,
}: CardFormModalProps) {
  const isEdit = mode === "edit";
  const [type, setType] = useState<"basic" | "cloze">(
    card?.type === "cloze" ? "cloze" : "basic",
  );
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(resolveBackValue(card));
  const [advancedNotes, setAdvancedNotes] = useState(
    card?.advancedNotes ?? "",
  );
  const [mnemonics, setMnemonics] = useState(card?.mnemonics ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && card) {
  setType(card.type === "cloze" ? "cloze" : "basic");
      setFront(card.front);
  setBack(resolveBackValue(card));
      setAdvancedNotes(card.advancedNotes ?? "");
      setMnemonics(card.mnemonics ?? "");
      return;
    }

    if (!isEdit) {
  setType("basic");
      setFront("");
      setBack("");
      setAdvancedNotes("");
      setMnemonics("");
    }
  }, [isEdit, card]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isEdit && card) {
        await cardRepo.update(card.id, {
          front,
          back,
          advancedNotes: advancedNotes || undefined,
          mnemonics: mnemonics || undefined,
        });
      } else {
        await cardRepo.create({
          deckId,
          type,
          front,
          back,
          advancedNotes: advancedNotes || undefined,
          mnemonics: mnemonics || undefined,
        });
      }

      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const title = isEdit ? "Edit Card" : "Add New Card";
  const primaryLabel = isEdit
    ? loading
      ? "Saving..."
      : "Save Changes"
    : loading
      ? "Adding..."
      : "Add Card";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-primary mb-4">{title}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="label">
              Card Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as "basic" | "cloze")}
              className="input"
              disabled={loading || isEdit}
            >
              <option value="basic">Basic (Front/Back)</option>
              <option value="cloze">Cloze (Fill in the blank)</option>
            </select>
          </div>

          <div>
            <label htmlFor="front" className="label">
              {type === "cloze" ? "Question (use {{...}} for blanks)" : "Front"}
            </label>
            <textarea
              id="front"
              value={front}
              onChange={(event) => setFront(event.target.value)}
              className="input h-24 resize-none"
              required
              disabled={loading}
              placeholder={
                type === "cloze"
                  ? "The capital of France is {{Paris}}"
                  : "What is the capital of France?"
              }
            />
          </div>

          <div>
            <label htmlFor="back" className="label">
              {type === "cloze" ? "Answer" : "Back"}
            </label>
            <textarea
              id="back"
              value={back}
              onChange={(event) => setBack(event.target.value)}
              className="input h-24 resize-none"
              required
              disabled={loading}
              placeholder={type === "cloze" ? "Paris" : "Paris"}
            />
          </div>

          <div>
            <label htmlFor="advancedNotes" className="label">
              Advanced Notes (optional)
            </label>
            <textarea
              id="advancedNotes"
              value={advancedNotes}
              onChange={(event) => setAdvancedNotes(event.target.value)}
              className="input h-24 resize-none"
              disabled={loading}
              placeholder="Additional insights, context, or deeper explanations..."
            />
          </div>

          <div>
            <label htmlFor="mnemonics" className="label">
              🧠 Memory Aid (optional)
            </label>
            <textarea
              id="mnemonics"
              value={mnemonics}
              onChange={(event) => setMnemonics(event.target.value)}
              className="input h-20 resize-none"
              disabled={loading}
              placeholder="Mnemonic device, memory technique, or trick to remember this..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
