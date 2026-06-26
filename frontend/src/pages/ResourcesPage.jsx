import React, { useMemo, useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Layers3,
  MonitorSpeaker,
  Plus,
  Search,
  Trash2,
  Pencil,
  X,
  Clock,
  MapPin,
  Users,
  Filter,
  RefreshCw,
  Calendar,
  ClipboardList,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { normalizeRoles, useAuth } from "../context/AuthContext";
import {
  getPrimaryRole,
  getRoleAccent,
  getSidebarItems,
} from "../utils/dashboardConfig";
import CustomDropdown from "../components/CustomDropdown";
import Modal from "../components/Modal";
import { useAlert } from "../context/AlertContext";
import { useSearch } from "../context/SearchContext";
import BookingFormModal from "../components/BookingFormModal";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getAssetUrl } from "../utils/fileUtils";
import { generateResourcePDF } from "../utils/pdfGenerator";
import { useTranslation } from "react-i18next";

const emptyForm = {
  name: "",
  type: "",
  capacity: "",
  location: "",
  availability: true,
  status: "ACTIVE",
  image: null,
  imagePreview: null,
};

const getResourceIcon = (type = "") => {
  const normalized = type.toLowerCase();
  if (normalized.includes("hall") || normalized.includes("room"))
    return Building2;
  if (normalized.includes("lab") || normalized.includes("computer"))
    return MonitorSpeaker;
  return Layers3;
};

const ResourcesPage = () => {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "si" ? "si-LK" : i18n.language === "ta" ? "ta-LK" : "en-US";
  const roles = normalizeRoles(user?.roles);
  const primaryRole = getPrimaryRole(roles);
  const isAdmin = roles.includes("ADMIN");
  const isLecturer = roles.includes("LECTURER");
  const isUser = roles.includes("USER");
  const accent = getRoleAccent(primaryRole);
  const queryClient = useQueryClient();

  const [limit, setLimit] = useState(9);
  const [filters, setFilters] = useState({
    type: "",
    capacity: "",
    location: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { showAlert } = useAlert();
  const location = useLocation();
  const [highlightId, setHighlightId] = useState(null);
  const highlightedRef = useRef(null);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedResourceForBooking, setSelectedResourceForBooking] =
    useState(null);
  const [isResourceLocked, setIsResourceLocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sidebarItems = useMemo(
    () => getSidebarItems(primaryRole),
    [primaryRole],
  );

  // Query
  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ["resources", filters, searchQuery],
    queryFn: async () => {
      const params = {
        page: 0,
        size: 1000,
        search: searchQuery || undefined,
        type: filters.type !== "" ? filters.type : undefined,
        minCapacity: filters.capacity !== "" ? filters.capacity : undefined,
        location: filters.location !== "" ? filters.location : undefined,
      };
      const res = await api.get("/resources", { params });
      return res.data;
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const { data: summary = null } = useQuery({
    queryKey: ["resources-summary"],
    queryFn: async () => {
      const res = await api.get("/resources/summary");
      return res.data || null;
    },
    enabled: !!user,
  });

  const resources = useMemo(() => {
    let rawResources = resourcesData?.content || [];

    // For students (USER role), show Sport Arena and Study Rooms
    if (isUser && !isAdmin && !isLecturer) {
      rawResources = rawResources.filter(
        (r) => r.type === "Sport Arena" || r.type === "Study Rooms",
      );
    }

    const typeOrder = {
      Auditorium: 1,
      "Lecture Hall": 2,
      "PC Lab": 3,
      "Meeting Room": 4,
      "Study Rooms": 5,
      "Sport Arena": 6,
    };

    return [...rawResources].sort((a, b) => {
      const orderA = typeOrder[a.type] || 99;
      const orderB = typeOrder[b.type] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name); // Secondary sort by name
    });
  }, [resourcesData, isUser, isAdmin, isLecturer]);

  const roleFilteredSummary = useMemo(() => {
    const isStudentOnly = isUser && !isAdmin && !isLecturer;
    if (!isStudentOnly) return null;

    const raw = resourcesData?.content || [];
    const allowed = raw.filter(
      (r) => r.type === "Sport Arena" || r.type === "Study Rooms",
    );

    return {
      total: allowed.length,
      typeCounts: allowed.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {}),
      capacityCounts: {
        10: allowed.filter((r) => r.capacity >= 10).length,
        50: allowed.filter((r) => r.capacity >= 50).length,
        100: allowed.filter((r) => r.capacity >= 100).length,
        200: allowed.filter((r) => r.capacity >= 200).length,
      },
      locationCounts: allowed.reduce((acc, r) => {
        acc[r.location] = (acc[r.location] || 0) + 1;
        return acc;
      }, {}),
    };
  }, [resourcesData, isUser, isAdmin, isLecturer]);

  const displaySummary =
    isUser && !isAdmin && !isLecturer ? roleFilteredSummary : summary;

  const typeOptions = useMemo(() => {
    const isStudentOnly = isUser && !isAdmin && !isLecturer;
    const allOptions = [
      {
        value: "",
        label: t("all_types", { defaultValue: "All Types" }),
        count: displaySummary?.total || 0,
      },
      {
        value: "Auditorium",
        label: t("auditorium", { defaultValue: "Auditorium" }),
        count: displaySummary?.typeCounts?.Auditorium || 0,
      },
      {
        value: "Lecture Hall",
        label: t("lecture_hall", { defaultValue: "Lecture Hall" }),
        count: displaySummary?.typeCounts?.["Lecture Hall"] || 0,
      },
      {
        value: "PC Lab",
        label: t("pc_lab", { defaultValue: "PC Lab" }),
        count: displaySummary?.typeCounts?.["PC Lab"] || 0,
      },
      {
        value: "Meeting Room",
        label: t("meeting_room", { defaultValue: "Meeting Room" }),
        count: displaySummary?.typeCounts?.["Meeting Room"] || 0,
      },
      {
        value: "Study Rooms",
        label: t("study_rooms", { defaultValue: "Study Rooms" }),
        count: displaySummary?.typeCounts?.["Study Rooms"] || 0,
      },
      {
        value: "Sport Arena",
        label: t("sport_arena", { defaultValue: "Sport Arena" }),
        count: displaySummary?.typeCounts?.["Sport Arena"] || 0,
      },
    ];

    if (isStudentOnly) {
      return allOptions.filter(
        (opt) =>
          opt.value === "" ||
          opt.value === "Sport Arena" ||
          opt.value === "Study Rooms",
      );
    }
    return allOptions;
  }, [summary, displaySummary, isUser, isAdmin, isLecturer]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) {
        return await api.put(`/resources/${editingId}`, payload);
      } else {
        return await api.post("/resources", payload);
      }
    },
    onSuccess: () => {
      setShowModal(false);
      showAlert(
        "success",
        editingId
          ? t("success_resource_updated", { defaultValue: "Asset updated successfully!" })
          : t("success_resource_registered", { defaultValue: "Asset registered successfully!" }),
      );
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources-summary"] });
    },
    onError: (err) => {
      showAlert(
        "error",
        err?.response?.data?.message || t("err_save_resource", { defaultValue: "Failed to save resource." }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/resources/${id}`);
    },
    onSuccess: () => {
      showAlert("success", t("success_resource_deleted", { defaultValue: "Asset deleted successfully!" }));
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources-summary"] });
    },
    onError: (err) => {
      showAlert(
        "error",
        err?.response?.data?.message || t("err_delete_resource", { defaultValue: "Failed to delete resource." }),
      );
    },
  });

  // Effect to reset limit when filters or search change
  useEffect(() => {
    if (!highlightId) {
      setLimit(9);
    }
  }, [filters, searchQuery, highlightId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(id);
      navigate(location.pathname, { replace: true });
      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.search, navigate, location.pathname]);

  // Reset search query and filters if the highlighted record is not found in the filtered list
  useEffect(() => {
    if (highlightId && resourcesData) {
      const hasIt = resources.some((r) => String(r.id) === String(highlightId));
      if (!hasIt) {
        if (searchQuery) {
          setSearchQuery("");
        }
        if (filters.type !== "" || filters.capacity !== "" || filters.location !== "") {
          setFilters({
            type: "",
            capacity: "",
            location: "",
          });
        }
      }
    }
  }, [highlightId, resources, resourcesData, searchQuery, setSearchQuery, filters]);

  // If highlightId is present and the resource is in the list but beyond the current limit,
  // we increase the limit to render it.
  useEffect(() => {
    if (highlightId && resources.length > 0) {
      const index = resources.findIndex((r) => String(r.id) === String(highlightId));
      if (index !== -1 && index >= limit) {
        setLimit(index + 1);
      }
    }
  }, [highlightId, resources, limit]);

  useEffect(() => {
    if (highlightId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightId, resources]);

  const resetFilters = () => {
    setFilters({
      type: "",
      capacity: "",
      location: "",
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (resource) => {
    setEditingId(resource.id);
    setForm({
      name: resource.name,
      type: resource.type,
      capacity: resource.capacity,
      location: resource.location,
      availability: resource.availability,
      status: resource.status,
      image: null,
      imagePreview: resource.image || resource.imageUrl || null,
    });
    setShowModal(true);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm((prev) => ({
          ...prev,
          image: e.target?.result,
          imagePreview: e.target?.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (event) => {
    event.preventDefault();

    const payload = {
      name: form.name,
      type: form.type,
      capacity: Number(form.capacity),
      location: form.location,
      availability: Boolean(form.availability),
      status: form.status,
    };

    if (form.image && typeof form.image === "string") {
      Object.assign(payload, { image: form.image });
    }

    saveMutation.mutate(payload);
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm(t("confirm_delete_resource", { defaultValue: "Delete this resource?" }));
    if (!confirmed) return;
    deleteMutation.mutate(id);
  };

  const openBookingModal = (resource) => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setSelectedResourceForBooking({
      resourceId: resource.id,
      bookingDate: todayStr,
    });
    setIsResourceLocked(true);
    setBookingModalOpen(true);
  };

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      logout={logout}
      title={t("campus_resources", { defaultValue: "Resources" })}
      items={sidebarItems}
      displayRole={primaryRole}
      {...accent}
    >
      {/* Search and Filters Section */}
      <section className="rounded-xl bg-white p-5 shadow-sm border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 mb-8">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            {/* Filters Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="flex flex-col">
                <CustomDropdown
                  label={t("asset_type", { defaultValue: "Asset Type" })}
                  icon={Building2}
                  options={typeOptions}
                  value={filters.type}
                  onChange={(val) =>
                    setFilters((prev) => ({ ...prev, type: val }))
                  }
                />
              </div>

              <div className="flex flex-col">
                <CustomDropdown
                  label={t("capacity", { defaultValue: "Capacity" })}
                  icon={Users}
                  options={[
                    {
                      value: "",
                      label: t("any_size", { defaultValue: "Any Size" }),
                      count: displaySummary?.total || 0,
                    },
                    {
                      value: "10",
                      label: t("people_10_plus", { defaultValue: "10+ People" }),
                      count: displaySummary?.capacityCounts?.["10"] || 0,
                    },
                    {
                      value: "50",
                      label: t("people_50_plus", { defaultValue: "50+ People" }),
                      count: displaySummary?.capacityCounts?.["50"] || 0,
                    },
                    {
                      value: "100",
                      label: t("people_100_plus", { defaultValue: "100+ People" }),
                      count: displaySummary?.capacityCounts?.["100"] || 0,
                    },
                    {
                      value: "200",
                      label: t("people_200_plus", { defaultValue: "200+ People" }),
                      count: displaySummary?.capacityCounts?.["200"] || 0,
                    },
                  ]}
                  value={filters.capacity}
                  onChange={(val) =>
                    setFilters((prev) => ({ ...prev, capacity: val }))
                  }
                />
              </div>

              <div className="flex flex-col">
                <CustomDropdown
                  label={t("campus_location", { defaultValue: "Campus Location" })}
                  icon={MapPin}
                  options={[
                    {
                      value: "",
                      label: t("all_locations", { defaultValue: "All Locations" }),
                      count: displaySummary?.total || 0,
                    },
                    {
                      value: "Main Building",
                      label: t("main_building", { defaultValue: "Main Building" }),
                      count: displaySummary?.locationCounts?.["Main Building"] || 0,
                    },
                    {
                      value: "Auditorium",
                      label: t("auditorium", { defaultValue: "Auditorium" }),
                      count: displaySummary?.locationCounts?.Auditorium || 0,
                    },
                    {
                      value: "New building",
                      label: t("new_building", { defaultValue: "New building" }),
                      count: displaySummary?.locationCounts?.["New building"] || 0,
                    },
                    {
                      value: "FOE Building",
                      label: t("foe_building", { defaultValue: "FOE Building" }),
                      count: displaySummary?.locationCounts?.["FOE Building"] || 0,
                    },
                    {
                      value: "FOB Building",
                      label: t("fob_building", { defaultValue: "FOB Building" }),
                      count: displaySummary?.locationCounts?.["FOB Building"] || 0,
                    },
                  ]}
                  value={filters.location}
                  onChange={(val) =>
                    setFilters((prev) => ({ ...prev, location: val }))
                  }
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 xl:ml-16 mb-0.5">
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                {t("reset", { defaultValue: "Reset" })}
              </button>
              {isAdmin && (
                <button
                  onClick={() => generateResourcePDF(resources)}
                  disabled={resources.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border-2 border-transparent px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-400 transition-all hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <ClipboardList className="h-4 w-4" />
                  {t("download_pdf", { defaultValue: "Download PDF" })}
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-500 whitespace-nowrap"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4" /> {t("new_asset", { defaultValue: "New Asset" })}
                </button>
              )}
            </div>
          </div>
        </section>

      {/* Resources Grid */}
      <section
        className={`grid gap-8 md:grid-cols-2 xl:grid-cols-3 mb-8 transition-all duration-300 ${isLoading ? "opacity-70 pointer-events-none" : "opacity-100"}`}
      >
        {resources.length === 0 && !isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white/50 dark:bg-slate-900/20 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/5">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
              {t("no_data", { defaultValue: "No records found" })}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
              {t("adjust_filters_desc", { defaultValue: "Try adjusting your filters or search query" })}
            </p>
            <button
              onClick={resetFilters}
              className="mt-5 px-5 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
            >
              {t("clear_all_filters", { defaultValue: "Clear All Filters" })}
            </button>
          </div>
        ) : (
          resources.slice(0, limit).map((resource) => {
            const Icon = getResourceIcon(resource.type);
            const resourceImage = resource.image || resource.imageUrl;
            return (
              <article
                key={resource.id}
                ref={highlightId === resource.id ? highlightedRef : null}
                className={`group animate-reveal overflow-hidden rounded-xl border transition-all duration-500 ${
                  highlightId === resource.id
                    ? "border-blue-500 shadow-2xl shadow-blue-500/20 z-10 scale-[1.01] bg-blue-50/80 dark:bg-blue-500/10"
                    : "border-slate-200 bg-white shadow-sm hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-900/5 dark:border-white/5 dark:bg-slate-900/50"
                }`}
              >
                {/* Image Section */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {resourceImage ? (
                    <img
                      src={getAssetUrl(resourceImage)}
                      alt={resource.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Icon className="h-12 w-12 text-slate-300 dark:text-slate-700 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <span
                    className={`absolute right-3 top-3 rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest shadow-lg ${
                      resource.status === "ACTIVE"
                        ? "bg-emerald-500 border-emerald-400 text-white"
                        : "bg-rose-500 border-rose-400 text-white"
                    }`}
                  >
                    {resource.status === "ACTIVE"
                      ? t("active", { defaultValue: "Active" })
                      : t("out_of_service", { defaultValue: "Out of Service" })}
                  </span>
                </div>

                {/* Content Section */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 mb-0.5">
                        {t(resource.type.toLowerCase().replace(" ", "_"), { defaultValue: resource.type })}
                      </p>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        {t(resource.name.toLowerCase().replace(/[^a-z0-9]/g, "_"), { defaultValue: resource.name })}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {t("capacity_short", { defaultValue: "Cap" })}: {resource.capacity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                        {t(resource.location.toLowerCase().replace(" ", "_"), { defaultValue: resource.location })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${resource.availability ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
                      ></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {resource.availability
                          ? t("available", { defaultValue: "Available" })
                          : t("reserved", { defaultValue: "Reserved" })}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(resource)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white transition-all dark:bg-white/5 dark:text-slate-400 dark:hover:bg-blue-600 dark:hover:text-white active:scale-95 shadow-sm"
                        >
                          <Pencil className="h-3 w-3" />
                          {t("edit", { defaultValue: "Edit" })}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(resource.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-rose-600 hover:text-white transition-all dark:bg-white/5 dark:text-slate-400 dark:hover:bg-rose-600 dark:hover:text-white active:scale-95 shadow-sm"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("delete", { defaultValue: "Delete" })}
                        </button>
                      </div>
                    )}

                    {(isUser || isLecturer) && (
                      <button
                        type="button"
                        disabled={
                          !resource.availability ||
                          resource.status === "OUT_OF_SERVICE"
                        }
                        onClick={() => openBookingModal(resource)}
                        className={`rounded-lg px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          !resource.availability ||
                          resource.status === "OUT_OF_SERVICE"
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:text-slate-600"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95"
                        }`}
                      >
                        {t("book_now", { defaultValue: "Book Now" })}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* View More Button */}
      {resources.length > limit && (
        <div className="flex justify-center mt-2 mb-12">
          <button
            onClick={() => setLimit(resources.length)}
            className="group flex items-center gap-2.5 rounded-lg border-2 border-blue-600/20 bg-transparent px-8 py-3 text-xs font-black uppercase tracking-widest text-blue-600 transition-all hover:border-blue-600 hover:bg-blue-50/50 hover:-translate-y-1 active:scale-95 dark:hover:bg-blue-900/20"
          >
            <span>{t("view_all_facilities", { defaultValue: "View All Facilities" })}</span>
            <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
          </button>
        </div>
      )}

      {/* Reusable Modal for Resource Form */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t("update_asset", { defaultValue: "Update Asset" }) : t("register_new_asset", { defaultValue: "Register New Asset" })}
        subtitle={t("facility_info_management", { defaultValue: "Facility Information Management" })}
        footer={
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              className="px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-95"
              onClick={() => setShowModal(false)}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              form="resource-form"
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 hover:-translate-y-0.5 active:scale-95"
            >
              {editingId ? t("update_asset", { defaultValue: "Update Asset" }) : t("register_asset", { defaultValue: "Register Asset" })}
            </button>
          </div>
        }
      >
        <form id="resource-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                {t("asset_image", { defaultValue: "Asset Image" })}
              </label>
              <div className="relative group">
                {form.imagePreview ? (
                  <div className="relative h-48 w-full overflow-hidden rounded-xl border-2 border-slate-200 dark:border-white/5">
                    <img
                      src={getAssetUrl(form.imagePreview)}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          image: null,
                          imagePreview: null,
                        }))
                      }
                      className="absolute right-3 top-3 rounded-full bg-rose-600 p-2 text-white shadow-xl hover:bg-rose-700 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-all hover:bg-white hover:border-blue-500 cursor-pointer dark:border-white/10 dark:bg-slate-800/50">
                    <Plus className="h-8 w-8 text-slate-300 mb-2" />
                    <span className="text-xs font-bold text-slate-500 tracking-tight">
                      {t("upload_highres_image", { defaultValue: "Upload high-res asset image" })}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  {t("asset_name", { defaultValue: "Asset Name" })}
                </label>
                <input
                  className="w-full rounded-xl bg-slate-50 border-2 border-slate-100 px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
                  placeholder={t("placeholder_asset_name", { defaultValue: "e.g. Grand Hall A" })}
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <CustomDropdown
                  label={t("category", { defaultValue: "Category" })}
                  options={[
                    { value: "Auditorium", label: t("auditorium", { defaultValue: "Auditorium" }) },
                    { value: "Lecture Hall", label: t("lecture_hall", { defaultValue: "Lecture Hall" }) },
                    { value: "PC Lab", label: t("pc_lab", { defaultValue: "PC Lab" }) },
                    { value: "Meeting Room", label: t("meeting_room", { defaultValue: "Meeting Room" }) },
                    { value: "Study Rooms", label: t("study_rooms", { defaultValue: "Study Rooms" }) },
                    { value: "Sport Arena", label: t("sport_arena", { defaultValue: "Sport Arena" }) },
                  ]}
                  value={form.type}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, type: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  {t("max_capacity", { defaultValue: "Max Capacity" })}
                </label>
                <input
                  className="w-full rounded-xl bg-slate-50 border-2 border-slate-100 px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-white/5 dark:text-white"
                  placeholder={t("placeholder_number", { defaultValue: "Enter number" })}
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, capacity: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <CustomDropdown
                  label={t("campus_location", { defaultValue: "Campus Location" })}
                  options={[
                    { value: "Main Building", label: t("main_building", { defaultValue: "Main Building" }) },
                    { value: "Auditorium", label: t("auditorium", { defaultValue: "Auditorium" }) },
                    { value: "New building", label: t("new_building", { defaultValue: "New building" }) },
                    { value: "FOE Building", label: t("foe_building", { defaultValue: "FOE Building" }) },
                    { value: "FOB Building", label: t("fob_building", { defaultValue: "FOB Building" }) },
                  ]}
                  value={form.location}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, location: val }))
                  }
                />
              </div>
              <CustomDropdown
                label={t("initial_availability", { defaultValue: "Initial Availability" })}
                options={[
                  { value: "true", label: t("publicly_available", { defaultValue: "Publicly Available" }) },
                  { value: "false", label: t("hidden_internal_only", { defaultValue: "Hidden / Internal Only" }) },
                ]}
                value={String(form.availability)}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, availability: val === "true" }))
                }
              />
              <CustomDropdown
                label={t("operational_status", { defaultValue: "Operational Status" })}
                options={[
                  { value: "ACTIVE", label: t("active_operations", { defaultValue: "Active Operations" }) },
                  { value: "OUT_OF_SERVICE", label: t("maintenance_required", { defaultValue: "Maintenance Required" }) },
                ]}
                value={form.status}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, status: val }))
                }
              />
            </div>
          </div>
        </form>
      </Modal>

      <BookingFormModal
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setIsResourceLocked(false);
        }}
        initialData={selectedResourceForBooking}
        resources={resources}
        lockResource={isResourceLocked}
        onSuccess={() => {
          // Success alert is handled by the modal for immediate feedback
        }}
      />

      {/* Floating Clock Overlay for Modal */}
      {bookingModalOpen && (
        <div className="fixed top-3 right-3 z-[10000] hidden md:block pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-md flex flex-col items-end gap-2">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-lg font-black text-white tabular-nums tracking-tight">
                {currentTime.toLocaleTimeString(dateLocale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 opacity-80">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                {currentTime.toLocaleDateString(
                  dateLocale,
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ResourcesPage;
