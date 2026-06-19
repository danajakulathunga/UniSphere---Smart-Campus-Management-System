import React, { useMemo, useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  X,
  Filter,
  RefreshCw,
  Search,
  Clock,
  AlertCircle,
  MessageSquare,
  Wrench,
  ShieldCheck,
  User as UserIcon,
  ChevronRight,
  Trash2,
  MapPin,
  ClipboardList,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import TicketCard from "../components/TicketCard";
import api from "../services/api";
import { normalizeRoles, useAuth } from "../context/AuthContext";
import {
  getPrimaryRole,
  getRoleAccent,
  getSidebarItems,
} from "../utils/dashboardConfig";
import CustomDropdown from "../components/CustomDropdown";
import Modal from "../components/Modal";
import ImageViewerModal from "../components/ImageViewerModal";
import { useAlert } from "../context/AlertContext";
import { useSearch } from "../context/SearchContext";
import { getAssetUrl, getAvatarColor } from "../utils/fileUtils";
import { generateTicketPDF } from "../utils/pdfGenerator";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const TicketsPage = () => {
  const { user, logout } = useAuth();
  const { searchQuery } = useSearch();
  const { t, i18n } = useTranslation();
  const getLocalizedLocation = (loc) => {
    if (!loc) return "";
    let localized = loc;
    const keyMap = {
      "main building": "main_building",
      "new building": "new_building",
      "foe building": "foe_building",
      "fob building": "fob_building",
      "auditorium": "auditorium"
    };
    const keys = Object.keys(keyMap).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      const regex = new RegExp(k, "gi");
      if (regex.test(localized)) {
        localized = localized.replace(regex, t(keyMap[k]));
      }
    }
    return localized;
  };
  const roles = normalizeRoles(user?.roles);
  const isUser = roles.includes("USER");
  const isLecturer = roles.includes("LECTURER");
  const isAdmin = roles.includes("ADMIN");
  const isTechnician = roles.includes("TECHNICIAN");
  const primaryRole = getPrimaryRole(roles);
  const accent = getRoleAccent(primaryRole);
  const queryClient = useQueryClient();

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comment, setComment] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteTicket, setNoteTicket] = useState(null);
  const { showAlert } = useAlert();
  const location = useLocation();
  const [highlightId, setHighlightId] = useState(null);
  const highlightedRef = useRef(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTicket, setRatingTicket] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignedTechnicianId: "",
  });

  const [editingTicket, setEditingTicket] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    priority: "MEDIUM",
    location: "",
    assetName: "",
    images: [],
  });

  const [page, setPage] = useState(0);
  const pageSize = 12;

  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  const getEndpoint = () => {
    if (isAdmin) return "/tickets";
    if (isTechnician) return "/tickets/assigned";
    return "/tickets/mine";
  };

  // Queries
  const { data: ticketsData, isLoading: isTicketsLoading } = useQuery({
    queryKey: [
      "tickets",
      isAdmin,
      isTechnician,
      filters.status,
      filters.priority,
      filters.assignedTechnicianId,
      searchQuery,
      page,
    ],
    queryFn: async () => {
      const params = {
        page,
        size: pageSize,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        assignedTechnicianId: filters.assignedTechnicianId || undefined,
        search: searchQuery || undefined,
      };
      const res = await api.get(getEndpoint(), { params });
      return res.data;
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
    staleTime: 60000, // 1 minute stale time for smoother navigation
    gcTime: 300000, // 5 minutes garbage collection
  });

  const tickets = ticketsData?.content || [];
  const totalPages = ticketsData?.totalPages || 1;

  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const res = await api.get("/resources", { params: { size: 100 } });
      return res.data?.content || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const res = await api.get("/users/technicians");
      return res.data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: summary = null } = useQuery({
    queryKey: ["tickets-summary"],
    queryFn: async () => {
      const res = await api.get("/tickets/summary");
      return res.data || null;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const isLoading = isTicketsLoading;

  // Sync selected ticket without losing details
  useEffect(() => {
    if (selectedTicket) {
      const refreshed = tickets.find((item) => item.id === selectedTicket.id);
      if (refreshed) {
        setSelectedTicket((prev) => ({ ...prev, ...refreshed }));
      }
    }
  }, [tickets]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters, searchQuery]);

  // Mutations
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (formData) => {
      if (editingTicket) {
        return await api.put(`/tickets/${editingTicket.id}`, formData);
      } else {
        return await api.post("/tickets", formData);
      }
    },
    onMutate: async () => {
      setIsSubmitting(true);
      // Show success alert immediately for zero-latency feel
      showAlert(
        "success",
        editingTicket
          ? t("success_ticket_updated", { defaultValue: "Ticket updated successfully!" })
          : t("success_ticket_created", { defaultValue: "Ticket created successfully!" }),
      );
      setCreateModalOpen(false);
    },
    onSuccess: () => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets-summary"] });
    },
    onError: (err) => {
      setIsSubmitting(false);
      // If error occurs, the previous "success" alert will be replaced by an error alert
      showAlert(
        "error",
        err?.response?.data?.message ||
        (editingTicket
          ? t("err_ticket_update_failed", { defaultValue: "Failed to update ticket." })
          : t("err_ticket_create_failed", { defaultValue: "Failed to create ticket." })),
      );
      setCreateModalOpen(true); // Re-open if failed
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ ticketId, technicianId }) => {
      await api.patch(`/tickets/${ticketId}/assign`, { technicianId });
    },
    onMutate: async ({ ticketId, technicianId }) => {
      // Find the technician name for optimistic update
      const tech = technicians.find((t) => t.id === technicianId);
      const techName = tech ? tech.name : "Assigned Technician";

      // Show success alert immediately for zero-latency feel
      showAlert(
        "success",
        t("success_ticket_assigned", { defaultValue: "Ticket assigned and status changed to In Progress!" }),
      );

      await queryClient.cancelQueries({ queryKey: ["tickets"] });
      const previousTickets = queryClient.getQueryData(["tickets"]);

      // Update selectedTicket if it matches the current mutation
      setSelectedTicket((prev) => {
        if (prev?.id === ticketId) {
          return {
            ...prev,
            status: "IN_PROGRESS",
            assignedTechnicianId: technicianId,
            assignedTechnicianName: techName,
          };
        }
        return prev;
      });

      // Optimistically update the list
      if (previousTickets) {
        queryClient.setQueryData(["tickets"], (old) => {
          if (!old?.content) return old;
          return {
            ...old,
            content: old.content.map((t) =>
              t.id === ticketId
                ? {
                  ...t,
                  status: "IN_PROGRESS",
                  assignedTechnicianId: technicianId,
                  assignedTechnicianName: techName,
                }
                : t,
            ),
          };
        });
      }
      return { previousTickets };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets-summary"] });
    },
    onError: (err, __, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
      showAlert(
        "error",
        err?.response?.data?.message || t("err_assign_technician_failed", { defaultValue: "Failed to assign technician." }),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ ticketId, status, resolutionNotes }) => {
      await api.patch(`/tickets/${ticketId}/status`, {
        status,
        resolutionNotes,
      });
    },
    onMutate: async ({ ticketId, status }) => {
      showAlert("success", t("msg_updating_status", { defaultValue: "Updating status to {{status}}...", status }));

      await queryClient.cancelQueries({ queryKey: ["tickets"] });
      const previousTickets = queryClient.getQueryData(["tickets"]);

      // Update selectedTicket if it matches the current mutation
      setSelectedTicket((prev) => {
        if (prev?.id === ticketId) {
          return { ...prev, status };
        }
        return prev;
      });

      if (previousTickets) {
        queryClient.setQueryData(["tickets"], (old) => {
          if (!old?.content) return old;
          return {
            ...old,
            content: old.content.map((t) =>
              t.id === ticketId ? { ...t, status } : t,
            ),
          };
        });
      }
      return { previousTickets };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets-summary"] });
    },
    onError: (err, __, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
      showAlert(
        "error",
        err?.response?.data?.message || t("err_failed_update_status", { defaultValue: "Failed to update status." }),
      );
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const res = await api.post(`/tickets/${ticketId}/comments`, { message });
      return res.data;
    },
    onSuccess: (data) => {
      setSelectedTicket(data);
      setComment("");
      showAlert("success", t("success_comment_added", { defaultValue: "Comment added successfully!" }));
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => {
      showAlert(
        "error",
        err?.response?.data?.message || t("err_failed_add_comment", { defaultValue: "Failed to add comment." }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ticketId) => {
      await api.delete(`/tickets/${ticketId}`);
    },
    onSuccess: () => {
      showAlert("success", t("success_ticket_cancelled", { defaultValue: "Ticket cancelled and deleted successfully!" }));
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets-summary"] });
    },
    onError: (err) => {
      showAlert(
        "error",
        err?.response?.data?.message || t("err_failed_cancel_ticket", { defaultValue: "Failed to cancel ticket." }),
      );
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ ticketId, rating }) => {
      await api.patch(`/tickets/${ticketId}/rate`, { rating });
    },
    onMutate: () => {
      setRatingModalOpen(false);
      showAlert("success", t("success_technician_rated", { defaultValue: "Technician rated successfully!" }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => {
      showAlert(
        "error",
        err?.response?.data?.message || t("err_failed_submit_rating", { defaultValue: "Failed to submit rating." }),
      );
      setRatingModalOpen(true);
    },
  });
  const getAllowedStatusOptions = (ticket) => {
    const currentStatus = ticket?.status || "OPEN";
    const options = [currentStatus];

    if (isAdmin) {
      if (currentStatus === "OPEN") {
        options.push("IN_PROGRESS", "REJECTED");
      } else if (currentStatus === "IN_PROGRESS") {
        options.push("REJECTED");
      }
      return [...new Set(options)];
    }

    if (isTechnician) {
      const isAssigned = ticket.assignedTechnicianId === user.id;
      if (isAssigned && currentStatus === "IN_PROGRESS") {
        options.push("RESOLVED", "REJECTED");
      }
      return [...new Set(options)];
    }

    return options;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(id);
      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  useEffect(() => {
    if (highlightId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightId, tickets]);

  const handleImages = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 10);
    const encoded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    );
    setForm((prev) => ({ ...prev, images: encoded }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitMutation.mutate(form);
  };

  const assignTechnician = (ticketId, technicianId) => {
    if (!technicianId) return;
    assignMutation.mutate({ ticketId, technicianId });
  };

  const updateStatus = (ticketId, status, resolutionNotes = "") => {
    statusMutation.mutate({ ticketId, status, resolutionNotes });
  };

  const addComment = () => {
    if (!selectedTicket || !comment.trim()) return;
    commentMutation.mutate({ ticketId: selectedTicket.id, message: comment });
  };

  const cancelTicket = (ticketId) => {
    if (
      !window.confirm("Are you sure you want to cancel and delete this ticket?")
    )
      return;
    deleteMutation.mutate(ticketId);
  };

  const openCommentsModal = async (ticket) => {
    if (ticket) {
      setSelectedTicket(ticket);
      setCommentsModalOpen(true);
      try {
        const res = await api.get(`/tickets/${ticket.id}`);
        setSelectedTicket(res.data);
      } catch (err) {
        console.error("Failed to fetch full ticket details:", err);
      }
    }
  };

  const openCreateModal = () => {
    setEditingTicket(null);
    setForm({
      title: "",
      category: "",
      description: "",
      priority: "MEDIUM",
      location: "",
      assetName: "",
      images: [],
    });
    setCreateModalOpen(true);
  };

  const [isCustomLocation, setIsCustomLocation] = useState(false);

  const openEditModal = (ticket) => {
    if (!ticket) return;

    setEditingTicket(ticket);
    setNoteTicket(ticket);
    setNoteDraft(ticket.resolutionNotes || "");

    const matchedResource = resources.find(
      (r) =>
        (ticket.assetName &&
          r.name === ticket.assetName &&
          r.location === ticket.location) ||
        r.name === ticket.location ||
        r.location === ticket.location ||
        `${r.name} - ${r.location}` === ticket.location,
    );
    setIsCustomLocation(!matchedResource && !!ticket.location);

    setForm({
      title: ticket.title || "",
      category: ticket.category || "",
      description: ticket.description || "",
      priority: ticket.priority || "MEDIUM",
      location: ticket.location || "",
      assetName: ticket.assetName || "",
      images: ticket.images || [],
    });
    setCreateModalOpen(true);
  };

  const openNotesModal = (ticket) => {
    if (ticket) {
      setNoteTicket(ticket);
      setNoteDraft(ticket.resolutionNotes || "");
      setNotesModalOpen(true);
    }
  };

  const openViewer = (images, index = 0) => {
    if (images && images.length > 0) {
      setViewerImages(images);
      setViewerInitialIndex(index);
      setViewerModalOpen(true);
    }
  };

  const openViewerForTicket = async (ticket, index = 0) => {
    if (ticket) {
      // Use existing images if available, otherwise fetch
      let imagesToView = ticket.images;

      if (!imagesToView || imagesToView.length === 0) {
        try {
          const res = await api.get(`/tickets/${ticket.id}`);
          const fullTicket = res.data;
          imagesToView = fullTicket.images;
          setSelectedTicket(fullTicket);
        } catch (err) {
          console.error("Failed to fetch ticket images:", err);
        }
      }

      if (imagesToView && imagesToView.length > 0) {
        openViewer(imagesToView, index);
      } else {
        showAlert("info", t("no_images", { defaultValue: "No images available for this ticket." }));
      }
    }
  };

  const saveResolutionNotes = async () => {
    if (!noteTicket) return;
    await updateStatus(noteTicket.id, noteTicket.status, noteDraft);
    setNotesModalOpen(false);
    setNoteTicket(null);
    setNoteDraft("");
  };

  const openRatingModal = (ticket) => {
    if (ticket) {
      setRatingTicket(ticket);
      setRatingValue(0);
      setRatingModalOpen(true);
    }
  };

  const submitRating = () => {
    if (!ratingTicket || ratingValue === 0) return;
    rateMutation.mutate({ ticketId: ratingTicket.id, rating: ratingValue });
  };

  const resetFilters = () => {
    setFilters({ status: "", priority: "", assignedTechnicianId: "" });
  };

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={isUser ? t("my_tickets") : t("tickets")}
      items={sidebarItems}
      displayRole={primaryRole}
      {...accent}
    >
      {/* Search and Filters Section */}
      <section className="rounded-xl bg-white p-5 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          {/* Filters Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <CustomDropdown
              label={t("status", { defaultValue: "Current Status" })}
              icon={Clock}
              options={[
                {
                  value: "",
                  label: t("all", { defaultValue: "All Statuses" }),
                  count: summary?.total || 0,
                },
                {
                  value: "OPEN",
                  label: t("open", { defaultValue: "Open Tickets" }),
                  count: summary?.statusCounts?.OPEN || 0,
                },
                {
                  value: "IN_PROGRESS",
                  label: t("in_progress"),
                  count: summary?.statusCounts?.IN_PROGRESS || 0,
                },
                {
                  value: "RESOLVED",
                  label: t("resolved"),
                  count: summary?.statusCounts?.RESOLVED || 0,
                },
                {
                  value: "REJECTED",
                  label: t("rejected"),
                  count: summary?.statusCounts?.REJECTED || 0,
                },
                {
                  value: "CANCELLED",
                  label: t("cancelled"),
                  count: summary?.statusCounts?.CANCELLED || 0,
                },
              ]}
              value={filters.status}
              onChange={(val) =>
                setFilters((prev) => ({ ...prev, status: val }))
              }
            />

            <CustomDropdown
              label={t("priority_level", { defaultValue: "Severity Level" })}
              icon={AlertCircle}
              options={[
                {
                  value: "",
                  label: t("any_priority", { defaultValue: "Any Priority" }),
                  count: summary?.total || 0,
                },
                {
                  value: "LOW",
                  label: t("low"),
                  count: summary?.priorityCounts?.LOW || 0,
                },
                {
                  value: "MEDIUM",
                  label: t("medium"),
                  count: summary?.priorityCounts?.MEDIUM || 0,
                },
                {
                  value: "HIGH",
                  label: t("high"),
                  count: summary?.priorityCounts?.HIGH || 0,
                },
                {
                  value: "CRITICAL",
                  label: t("critical"),
                  count: summary?.priorityCounts?.CRITICAL || 0,
                },
              ]}
              value={filters.priority}
              onChange={(val) =>
                setFilters((prev) => ({ ...prev, priority: val }))
              }
            />

            {!isTechnician && (
              <CustomDropdown
                label={t("assigned_to", { defaultValue: "Assigned To" })}
                icon={Wrench}
                options={[
                  {
                    value: "",
                    label: t("all_technicians", { defaultValue: "All Technicians" }),
                    count: summary?.total || 0,
                  },
                  {
                    value: "UNASSIGNED",
                    label: t("unassigned_tickets", { defaultValue: "Unassigned Tickets" }),
                    count: summary?.unassignedCount || 0,
                  },
                  ...technicians.map((t) => ({
                    value: t.id,
                    label: t.name,
                    count: summary?.technicianCounts?.[t.id] || 0,
                  })),
                ]}
                value={filters.assignedTechnicianId}
                onChange={(val) =>
                  setFilters((prev) => ({ ...prev, assignedTechnicianId: val }))
                }
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 xl:ml-16 mb-0.5">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              {t("reset")}
            </button>
            {isAdmin && (
              <button
                onClick={() => generateTicketPDF(tickets)}
                disabled={tickets.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border-2 border-transparent px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-400 transition-all hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white shadow-sm active:scale-95 disabled:opacity-50"
              >
                <ClipboardList className="h-4 w-4" />
                {t("download_pdf")}
              </button>
            )}
            {(isUser || isLecturer || isAdmin) && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-500 whitespace-nowrap"
                onClick={openCreateModal}
              >
                <Plus className="h-4 w-4" /> {t("new_ticket")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tickets Grid */}
      <section
        className={`grid gap-8 md:grid-cols-2 xl:grid-cols-3 items-start mb-10 transition-all duration-300 ${isLoading ? "opacity-70 pointer-events-none" : "opacity-100"}`}
      >
        {tickets.length === 0 && !isLoading ? (
          <div className="col-span-full py-20 text-center rounded-xl bg-white border-2 border-dashed border-slate-200 fade-in-up dark:bg-slate-900/20 dark:border-white/5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 mb-6">
              <Search className="h-10 w-10 text-slate-300" />
            </div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              {t("no_tickets_found", { defaultValue: "No tickets found" })}
            </h4>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t("adjust_filters_desc", { defaultValue: "Try adjusting your filters or search query" })}
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 px-6 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
            >
              {t("clear_all_filters", { defaultValue: "Clear All Filters" })}
            </button>
          </div>
        ) : (
          tickets.map((ticket, index) => (
            <div
              key={ticket.id}
              ref={highlightId === ticket.id ? highlightedRef : null}
              className={`animate-reveal rounded-xl transition-all duration-500 ${highlightId === ticket.id ? "ring-4 ring-blue-500/20 shadow-2xl scale-[1.02] bg-blue-50/50 dark:bg-blue-900/20" : ""}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TicketCard
                ticket={ticket}
                isAdmin={isAdmin}
                isTechnician={isTechnician}
                isUser={isUser}
                isLecturer={isLecturer}
                technicians={technicians}
                statusOptions={getAllowedStatusOptions(ticket)}
                onAssignTechnician={assignTechnician}
                onUpdateStatus={updateStatus}
                onCancelTicket={cancelTicket}
                onOpenComments={openCommentsModal}
                onOpenNotes={openNotesModal}
                onEditTicket={openEditModal}
                onViewImages={openViewerForTicket}
                onRateTicket={openRatingModal}
                user={user}
                isHighlighted={highlightId === ticket.id}
              />
            </div>
          ))
        )}
      </section>

      {/* Create Ticket Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingTicket ? t("edit_incident", { defaultValue: "Edit Incident" }) : t("report_new_incident", { defaultValue: "Report New Incident" })}
        subtitle={
          editingTicket
            ? `${t("updating", { defaultValue: "Updating" })} Ticket #${editingTicket.id.substring(0, 8)}`
            : t("technician_service_request", { defaultValue: "Technician Service Request" })
        }
        footer={
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              className="px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-95"
              onClick={() => setCreateModalOpen(false)}
            >
              {t("discard", { defaultValue: "Discard" })}
            </button>
            <button
              form="create-ticket-form"
              type="submit"
              className="rounded-xl bg-blue-600 px-10 py-4 text-sm font-black text-white shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 hover:-translate-y-0.5 active:scale-95"
            >
              {editingTicket ? t("update_ticket", { defaultValue: "Update Ticket" }) : t("submit_report", { defaultValue: "Submit Report" })}
            </button>
          </div>
        }
      >
        <form
          id="create-ticket-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {editingTicket && isUser && editingTicket.status !== "OPEN" && (
            <div className="rounded-xl bg-amber-50 p-4 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-500/20">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {t("err_edit_open_only", { defaultValue: "You can only edit tickets while they are in OPEN state." })}
              </p>
            </div>
          )}
          {(() => {
            const canEdit =
              !editingTicket ||
              isAdmin ||
              (isUser && editingTicket.status === "OPEN") ||
              (isTechnician && editingTicket.assignedTechnicianId === user.id);
            return (
              <div className={`grid gap-4 ${!canEdit ? "opacity-75" : ""}`}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      {t("title", { defaultValue: "Title" })}
                    </label>
                    <input
                      className="w-full rounded-xl bg-slate-50 border-2 border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white disabled:opacity-50"
                      placeholder={t("placeholder_title", { defaultValue: "Brief summary" })}
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      required
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      {t("category", { defaultValue: "Category" })}
                    </label>
                    <CustomDropdown
                      options={[
                        { value: "IT Technician", label: t("it_technician", { defaultValue: "IT Technician" }) },
                        {
                          value: "Mechanical Technician",
                          label: t("mechanical_technician", { defaultValue: "Mechanical Technician" }),
                        },
                        {
                          value: "Electrical Technician",
                          label: t("electrical_technician", { defaultValue: "Electrical Technician" }),
                        },
                        {
                          value: "Maintenance Technician",
                          label: t("maintenance_technician", { defaultValue: "Maintenance Technician" }),
                        },
                      ]}
                      value={form.category}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, category: val }))
                      }
                      placeholder={t("placeholder_category", { defaultValue: "Select Technician Category" })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <CustomDropdown
                    label={t("priority_level", { defaultValue: "Priority Level" })}
                    icon={AlertCircle}
                    options={[
                      { value: "LOW", label: t("low", { defaultValue: "Low Priority" }) },
                      { value: "MEDIUM", label: t("medium", { defaultValue: "Medium Priority" }) },
                      { value: "HIGH", label: t("high", { defaultValue: "High Priority" }) },
                      { value: "CRITICAL", label: t("critical", { defaultValue: "Critical Priority" }) },
                    ]}
                    value={form.priority}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, priority: val }))
                    }
                    disabled={!canEdit}
                  />
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      {t("location", { defaultValue: "Location" })}
                    </label>
                    {!isCustomLocation ? (
                      <CustomDropdown
                        options={[
                          ...resources.map((r) => ({
                            value: `${r.name} - ${r.location}`,
                            label: `${r.name} - ${getLocalizedLocation(r.location)}`,
                            assetName: r.name,
                            campusLocation: r.location,
                          })),
                          { value: "OTHER", label: t("other_manual", { defaultValue: "Other (Enter manually)" }) },
                        ]}
                        value={
                          form.assetName && form.location
                            ? `${form.assetName} - ${form.location}`
                            : form.location
                        }
                        onChange={(val) => {
                          if (val === "OTHER") {
                            setIsCustomLocation(true);
                            setForm((prev) => ({
                              ...prev,
                              location: "",
                              assetName: "",
                            }));
                          } else {
                            const res = resources.find(
                              (r) => `${r.name} - ${r.location}` === val,
                            );
                            if (res) {
                              setForm((prev) => ({
                                ...prev,
                                location: res.location,
                                assetName: res.name,
                              }));
                            } else {
                              setForm((prev) => ({
                                ...prev,
                                location: val,
                                assetName: "",
                              }));
                            }
                          }
                        }}
                        placeholder={t("placeholder_location", { defaultValue: "Select or enter location" })}
                        disabled={!canEdit}
                      />
                    ) : (
                      <div className="relative">
                        <input
                          className="w-full rounded-xl bg-slate-50 border-2 border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
                          placeholder={t("placeholder_type_location", { defaultValue: "Type location manually..." })}
                          value={
                            form.assetName
                              ? `${form.assetName} - ${form.location}`
                              : form.location
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.includes(" - ")) {
                              const [asset, loc] = val.split(" - ");
                              setForm((prev) => ({
                                ...prev,
                                assetName: asset,
                                location: loc,
                              }));
                            } else {
                              setForm((prev) => ({
                                ...prev,
                                location: val,
                                assetName: "",
                              }));
                            }
                          }}
                          required
                          disabled={!canEdit}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomLocation(false);
                            setForm((prev) => ({ ...prev, location: "" }));
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-500"
                        >
                          {t("back", { defaultValue: "Back" })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    {t("description", { defaultValue: "Description" })}
                  </label>
                  <textarea
                    className="w-full min-h-[120px] rounded-xl bg-slate-50 border-2 border-slate-100 px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white disabled:opacity-50"
                    placeholder={t("placeholder_details", { defaultValue: "Provide details about the problem..." })}
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    required
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    {t("evidence", { defaultValue: "Evidence (Images)" })}
                  </label>
                  {canEdit && (
                    <label className="flex h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-all hover:bg-white hover:border-blue-500 cursor-pointer dark:border-white/10 dark:bg-slate-800/50">
                      <Plus className="h-6 w-6 text-slate-300 mb-1" />
                      <span className="text-[11px] font-bold text-slate-500 tracking-tight">
                        {t("upload_evidence", { defaultValue: "Upload up to 10 images" })}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        multiple
                        onChange={handleImages}
                      />
                    </label>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {form.images.map((image, index) => (
                      <div key={index} className="relative group/thumb">
                        <button
                          type="button"
                          onClick={() => openViewer(form.images, index)}
                          className="h-16 w-16 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm hover:scale-105 transition-transform"
                        >
                          <img
                            src={getAssetUrl(image)}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== index),
                            }))
                          }
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover/thumb:opacity-100 transition-all hover:bg-rose-600 active:scale-90 z-10"
                          title={t("remove_image", { defaultValue: "Remove Image" })}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {editingTicket && (isAdmin || isTechnician) && (
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-2">
                      {t("admin_controls", { defaultValue: "Administrative Controls" })}
                    </p>
                    <div className="grid gap-5 md:grid-cols-2">
                      <CustomDropdown
                        label={t("ticket_status", { defaultValue: "Ticket Status" })}
                        icon={Clock}
                        options={[
                          { value: "OPEN", label: t("open", { defaultValue: "Open" }) },
                          { value: "IN_PROGRESS", label: t("in_progress", { defaultValue: "In Progress" }) },
                          { value: "RESOLVED", label: t("resolved", { defaultValue: "Resolved" }) },
                          { value: "REJECTED", label: t("rejected", { defaultValue: "Rejected" }) },
                        ]}
                        value={editingTicket.status}
                        onChange={(val) => updateStatus(editingTicket.id, val)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                        {t("resolution_notes", { defaultValue: "Resolution Notes" })}
                      </label>
                      <textarea
                        className="w-full min-h-[100px] rounded-xl bg-slate-50 border-2 border-slate-100 px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
                        placeholder={t("placeholder_resolution", { defaultValue: "Resolution details..." })}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onBlur={() => saveResolutionNotes()}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* Discussion Modal */}
      <Modal
        isOpen={commentsModalOpen && !!selectedTicket}
        onClose={() => setCommentsModalOpen(false)}
        title={selectedTicket?.title || t("ticket_thread", { defaultValue: "Ticket Thread" })}
        subtitle={t("discussion_thread", { defaultValue: "Discussion Thread" })}
        footer={
          <div className="relative group">
            <textarea
              className="w-full min-h-[64px] rounded-xl bg-slate-50 border-2 border-slate-100 p-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white pr-20 scrollbar-hide"
              placeholder={t("placeholder_type_message", { defaultValue: "Type your message..." })}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              onClick={addComment}
              disabled={!comment.trim()}
              className="absolute top-1/2 -translate-y-1/2 right-4 h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50 active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Evidence Slider / Gallery */}
          <div className="bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1 flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" />
              {t("evidence_gallery", { defaultValue: "Evidence Gallery" })}
            </p>
            {selectedTicket?.images && selectedTicket.images.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 auth-scroll-user scrollbar-hide">
                {selectedTicket.images.map((image, i) => (
                  <button
                    key={i}
                    onClick={() => openViewer(selectedTicket.images, i)}
                    className="h-20 w-32 rounded-xl overflow-hidden shrink-0 border-2 border-white dark:border-slate-800 shadow-sm hover:scale-105 transition-all duration-300 active:scale-95"
                  >
                    <img
                      src={getAssetUrl(image)}
                      alt="Evidence"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4 bg-white/50 dark:bg-black/20 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("no_images", { defaultValue: "No images available" })}</p>
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto px-2 py-4 auth-scroll-user bg-slate-50/30 dark:bg-black/10 rounded-2xl border border-slate-100 dark:border-white/5">
            {(selectedTicket?.comments || []).map((item) => {

              const isMe = item.authorId === user.id;
              return (
                <div key={item.commentId} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"} animate-reveal`}>
                  {/* Avatar */}
                  <div className="flex flex-col justify-end pb-1">
                    {item.authorProfilePicture ? (
                      <div className="h-9 w-9 rounded-xl overflow-hidden border-2 border-white shadow-md dark:border-slate-800 shrink-0">
                        <img
                          src={getAssetUrl(item.authorProfilePicture)}
                          alt={item.authorName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`h-9 w-9 rounded-xl ${getAvatarColor(item.authorName)} flex items-center justify-center text-white font-black text-xs shadow-md shrink-0`}
                      >
                        {item.authorName?.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && (
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-2">
                        {item.authorName}
                      </span>
                    )}
                    <div
                      className={`relative px-4 py-3 rounded-2xl shadow-sm border ${isMe
                        ? "bg-blue-600 border-blue-500 text-white rounded-br-none"
                        : "bg-white border-slate-100 text-slate-700 dark:bg-slate-800 dark:border-white/5 dark:text-slate-200 rounded-bl-none"
                        }`}
                    >
                      <p className="text-sm font-medium leading-relaxed break-words">
                        {item.message}
                      </p>
                      <div className={`mt-1.5 flex items-center gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString(
                                i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : t("just_now", { defaultValue: "Just now" })}
                        </span>
                        {isMe && <ShieldCheck className="h-2.5 w-2.5 text-blue-200" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {(selectedTicket?.comments || []).length === 0 && (
              <div className="text-center py-20">
                <div className="h-16 w-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-slate-300" />
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t("no_conversation", { defaultValue: "No conversation yet" })}</h4>
                <p className="text-xs font-medium text-slate-500 mt-1">{t("start_discussion", { defaultValue: "Start the discussion by typing below" })}</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Technician Notes Modal */}
      <Modal
        isOpen={notesModalOpen && !!noteTicket}
        onClose={() => setNotesModalOpen(false)}
        title={t("resolution_audit", { defaultValue: "Resolution Audit" })}
        subtitle={t("official_documentation", { defaultValue: "Official Maintenance Documentation" })}
        footer={
          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="rounded-xl px-8 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              onClick={() => setNotesModalOpen(false)}
            >
              {t("discard", { defaultValue: "Discard" })}
            </button>
            <button
              type="button"
              onClick={saveResolutionNotes}
              className="rounded-xl bg-blue-600 px-10 py-4 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-95"
            >
              {t("authorize_resolution", { defaultValue: "Authorize Resolution" })}
            </button>
          </div>
        }
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
              {t("final_resolution_report", { defaultValue: "Final Resolution Report" })}
            </label>
            <textarea
              className="w-full min-h-[240px] rounded-xl bg-slate-50 border-2 border-slate-100 p-6 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
              placeholder={t("placeholder_resolution_report", { defaultValue: "Describe the final resolution outcome and any post-service steps taken..." })}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Technician Rating Modal */}
      <Modal
        isOpen={ratingModalOpen && !!ratingTicket}
        onClose={() => setRatingModalOpen(false)}
        title={t("rate_technician", { defaultValue: "Rate Technician" })}
        subtitle={t("rate_technician_service", { name: ratingTicket?.assignedTechnicianName || t("the_technician", { defaultValue: "the technician" }), defaultValue: `Rate ${ratingTicket?.assignedTechnicianName || "the technician"}'s service` })}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              onClick={() => setRatingModalOpen(false)}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              onClick={submitRating}
              disabled={ratingValue === 0}
              className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-white shadow-xl shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("submit_rating", { defaultValue: "Submit Rating" })}
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <div className={`h-16 w-16 rounded-full ${getAvatarColor(ratingTicket?.assignedTechnicianName)} flex items-center justify-center text-white font-black text-xl shadow-md`}>
            {ratingTicket?.assignedTechnicianName
              ?.substring(0, 2)
              .toUpperCase() || "TC"}
          </div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white">
            {ratingTicket?.assignedTechnicianName || t("technician", { defaultValue: "Technician" })}
          </h4>
          <p className="text-xs font-medium text-slate-500 text-center max-w-[250px]">
            {t("rating_question", {
              id: ratingTicket?.id?.substring(0, 8) || "",
              defaultValue: `How satisfied are you with the resolution of ticket #${ratingTicket?.id?.substring(0, 8)}?`
            })}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRatingValue(star)}
                className={`p-1 transition-transform hover:scale-110 active:scale-95`}
              >
                <Star
                  className={`h-8 w-8 ${ratingValue >= star
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-200 dark:text-slate-700 hover:text-amber-200 dark:hover:text-amber-900/50"
                    } transition-colors`}
                />
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <ImageViewerModal
        isOpen={viewerModalOpen}
        onClose={() => setViewerModalOpen(false)}
        images={viewerImages}
        initialIndex={viewerInitialIndex}
      />
      {/* Pagination */}
      {totalPages > 1 && (
        <section className="flex items-center justify-center gap-4 py-8">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 dark:bg-slate-900 dark:border-white/5 dark:text-slate-400"
          >
            {t("previous", { defaultValue: "Previous" })}
          </button>
          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-10 w-10 rounded-xl text-xs font-black transition-all ${page === i
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-white border border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-500 dark:bg-slate-900 dark:border-white/5"
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 dark:bg-slate-900 dark:border-white/5 dark:text-slate-400"
          >
            {t("next", { defaultValue: "Next" })}
          </button>
        </section>
      )}
    </DashboardLayout>
  );
};

export default TicketsPage;
