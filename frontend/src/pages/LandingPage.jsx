import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
// background image removed: bg2.png not present in assets
import colomboImg from "../assets/landing_pg_trust_indicators/colombo.jpg";
import sliitImg from "../assets/landing_pg_trust_indicators/sliit.jpg";
import moraImg from "../assets/landing_pg_trust_indicators/mora.jpg";
import {
  CalendarDays,
  Wrench,
  ShieldCheck,
  BellRing,
  ArrowRight,
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Send,
  FileText,
  User,
  Layers,
  Users,
  Activity,
  ArrowDown,
  QrCode,
  ChevronDown,
  Check,
  Star,
  Download,
} from "lucide-react";
import InteractiveWorkspaces from "../components/InteractiveWorkspaces";

// Simplified Scroll Animation Hook for items below fold
function useScrollAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  return [domRef, isVisible];
}

const FadeInSection = ({ children, delay = 0 }) => {
  const [ref, isVisible] = useScrollAnimation();
  return (
    <div
      ref={ref}
      className={`transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Smooth count-up counter component
function AnimatedCounter({ value, suffix = "", duration = 1200 }) {
  const [count, setCount] = useState(0);
  const [isText, setIsText] = useState(false);
  const elementRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          if (value === "Unlimited") {
            const target = 100;
            let startTime = null;
            const animateText = (timestamp) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / duration, 1);
              const current = Math.floor(progress * target);
              setCount(current);
              if (progress < 1) {
                requestAnimationFrame(animateText);
              } else {
                setIsText(true);
              }
            };
            requestAnimationFrame(animateText);
          } else {
            const target = parseInt(value, 10);
            if (isNaN(target)) {
              setCount(value);
              return;
            }
            let startTime = null;
            const animateNum = (timestamp) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / duration, 1);
              // easeOutQuad
              const easeProgress = progress * (2 - progress);
              const current = Math.floor(easeProgress * target);
              setCount(current);
              if (progress < 1) {
                requestAnimationFrame(animateNum);
              } else {
                setCount(target);
              }
            };
            requestAnimationFrame(animateNum);
          }
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = elementRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [value, duration, hasAnimated]);

  return (
    <span ref={elementRef}>
      {isText ? value : `${count}${suffix}`}
    </span>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);
  const [hoveredFeatureIndex, setHoveredFeatureIndex] = useState(null);

  const languages = [
    { code: "en", label: "English", badge: "EN" },
    { code: "si", label: "සිංහල", badge: "SI" },
    { code: "ta", label: "தமிழ்", badge: "TA" }
  ];

  const currentLanguage = languages.find(l => l.code === (i18n.language || "en")) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsLoaded(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);

      // Section tracking logic
      const sections = ["features", "resources", "about", "contact", "connectivity"];
      const current = sections.find((section) => {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          return rect.top <= 120 && rect.bottom >= 120;
        }
        return false;
      });
      if (current) setActiveSection(current);
      else if (window.scrollY < 100) setActiveSection("");
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const keyPlatformFeatures = [
    {
      icon: <CalendarDays className="h-6 w-6 text-blue-400" />,
      title: "facility_booking",
      description: "facility_booking_desc"
    },
    {
      icon: <BookOpen className="h-6 w-6 text-indigo-400" />,
      title: "lecture_management",
      description: "lecture_management_desc"
    },
    {
      icon: <QrCode className="h-6 w-6 text-teal-400" />,
      title: "qr_attendance",
      description: "qr_attendance_desc"
    },
    {
      icon: <Wrench className="h-6 w-6 text-rose-400" />,
      title: "ticket_management",
      description: "ticket_management_desc"
    },
    {
      icon: <Send className="h-6 w-6 text-purple-400" />,
      title: "announcements",
      description: "announcements_desc"
    },
    {
      icon: <BellRing className="h-6 w-6 text-amber-400" />,
      title: "notifications",
      description: "notifications_desc"
    },
    {
      icon: <FileText className="h-6 w-6 text-cyan-400" />,
      title: "pdf_reporting",
      description: "pdf_reporting_desc"
    },
    {
      icon: <User className="h-6 w-6 text-emerald-400" />,
      title: "profile_management",
      description: "profile_management_desc"
    }
  ];

  return (
    <div className="landing-page-shell min-h-screen font-sans text-slate-100 overflow-x-hidden selection:bg-blue-200 selection:text-blue-900 transition-colors duration-300">
      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
          100% { top: 0%; opacity: 0.8; }
        }
        .animate-scan-line {
          animation: scanline 2.5s linear infinite;
        }
      `}</style>
      <div className="landing-page-overlay" aria-hidden="true" />
      <div className="grid-pattern" aria-hidden="true" />

      <div className="relative z-10">
        {/* Professional Boxed Floating Navbar */}
        <div
          className="fixed top-0 left-0 w-full z-50 transition-all duration-300"
        >
          <nav
            className={`w-full transition-all duration-300 border-b ${
              scrolled
                ? "bg-slate-950/85 backdrop-blur-2xl border-indigo-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
                : "bg-slate-950/40 backdrop-blur-md border-white/10"
            }`}
          >
            <div className="w-full px-6 lg:px-12">
              <div
                className={`relative flex justify-between items-center transition-all duration-300 ${scrolled ? "h-[72px]" : "h-[90px]"}`}
              >
                {/* Logo Section */}
                <div
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="flex items-center gap-3 group cursor-pointer z-10"
                >
                  <div
                    className={`bg-gradient-to-tr from-indigo-500 to-purple-600 p-2.5 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-all duration-300 ${scrolled ? "scale-90" : "scale-100"}`}
                  >
                    <GraduationCap
                      className="h-6 w-6 text-white"
                      strokeWidth={2.5}
                    />
                  </div>
                  <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tighter">
                    UniSphere
                  </span>
                </div>

                {/* Desktop Navigation Links */}
                <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-2">
                  {["Resources", "Features", "About"].map((item) => (
                    <a
                      key={item}
                      href={`#${item.toLowerCase()}`}
                      className={`relative text-[14px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all duration-500 group ${
                        activeSection === item.toLowerCase()
                          ? "text-white bg-indigo-500/40 border border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {t(item.toLowerCase())}
                    </a>
                  ))}
                </div>

                {/* Right Header Section (grouped to keep links centered) */}
                <div className="flex items-center gap-4 z-10">
                  {/* Language Dropdown Selector */}
                  <div ref={langDropdownRef} className="relative z-50">
                    <button
                      onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                      className={`flex items-center gap-2.5 rounded-full border transition-all duration-300 focus:outline-none ${
                        scrolled
                          ? "h-10 pl-2 pr-4 bg-slate-900/80 border-indigo-500/30 text-white hover:bg-slate-900 text-[13px]"
                          : "h-12 pl-2.5 pr-5 bg-white/5 border-white/10 text-white hover:bg-white/10 text-[14px]"
                      }`}
                    >
                      <span className={`flex items-center justify-center rounded-full bg-indigo-500/20 font-bold uppercase tracking-wider text-indigo-300 ${
                        scrolled ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-[12px]"
                      }`}>
                        {currentLanguage.badge}
                      </span>
                      <span className="font-bold tracking-wide">
                        {currentLanguage.label}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isLangDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isLangDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border border-indigo-500/20 bg-slate-950/95 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              i18n.changeLanguage(lang.code);
                              setIsLangDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[14px] font-bold transition-all duration-200 ${
                              i18n.language === lang.code
                                ? "bg-indigo-600/20 text-indigo-300"
                                : "text-slate-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <span>{lang.label}</span>
                            {i18n.language === lang.code && (
                              <Check className="h-4 w-4 text-indigo-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Desktop Auth Buttons */}
                  <div className="hidden md:flex items-center gap-3">
                    <Link
                      to="/login"
                      className={`inline-flex items-center justify-center rounded-[1.5rem] bg-white/10 hover:bg-white/20 border border-white/15 font-black uppercase tracking-wider text-white transition-all duration-300 ${
                        scrolled
                          ? "h-10 px-6 text-[12px]"
                          : "h-12 px-8 text-[13.5px] rounded-[1.75rem]"
                      }`}
                    >
                      {t("sign_in")}
                    </Link>
                    <Link
                      to="/register"
                      className={`inline-flex items-center justify-center rounded-[1.5rem] bg-gradient-to-r from-indigo-600 to-blue-600 font-black uppercase tracking-wider text-white shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] transition-all hover:from-indigo-500 hover:to-blue-500 hover:shadow-[0_15px_25px_-10px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 active:scale-95 ${
                        scrolled
                          ? "h-10 px-6 text-[12px]"
                          : "h-12 px-8 text-[13.5px] rounded-[1.75rem]"
                      }`}
                    >
                      {t("join_now")}
                    </Link>
                  </div>

                  {/* Mobile Menu Toggle */}
                  <div className="lg:hidden flex items-center">
                    <button className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 6h16M4 12h16m-7 6h7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>      
              </div>
            </div>
          </nav>
        </div>

        {/* Hero Section */}
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden pt-48 pb-24">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
            <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10 w-full flex flex-col items-center">
            <div
              className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isLoaded
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md shadow-sm animate-pulse">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                  {t("hero_sparkle")}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">
                {t("hero_title_1")}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                  {t("hero_title_2")}
                </span>
              </h1>

              <h2 className="text-base sm:text-xl text-slate-200/90 font-medium mb-5 max-w-3xl mx-auto leading-relaxed">
                {t("hero_subtitle")}
              </h2>

              <p className="text-xs sm:text-sm text-slate-400/80 mb-8 max-w-2xl mx-auto leading-relaxed">
                {t("hero_description")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center rounded-[2rem] bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-3.5 text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:from-indigo-500 hover:to-blue-500 hover:shadow-xl hover:shadow-indigo-600/40 hover:-translate-y-1 active:scale-[0.98]"
                >
                  {t("get_started")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-[2rem] bg-white/5 text-white px-8 py-3.5 text-sm font-bold border border-white/10 backdrop-blur-md shadow-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]"
                >
                  {t("access_portal")}
                </Link>
              </div>

              {/* Trust Indicators Centered - Restored exactly below buttons */}
              <div className="flex flex-col items-center gap-4 text-sm text-slate-300/80 font-medium px-6 py-3 rounded-full mt-12">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[colomboImg, sliitImg, moraImg].map((img, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-slate-800 bg-white overflow-hidden shadow-sm"
                      >
                        <img
                          src={img}
                          alt="University Partner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-slate-800 overflow-hidden text-[10px] flex items-center justify-center font-bold bg-slate-800 text-white shadow-sm">
                      +2k
                    </div>
                  </div>
                  <span className="tracking-wide">
                    {t("trusted_by")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Overview Section (id="resources") */}
        <div id="resources" className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[0.75rem] mb-3">
                  {t("tailored_workspaces")}
                </div>
                <h3 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                  {t("everything_campus_needs")}
                </h3>
                <p className="text-base sm:text-lg text-slate-300/80 leading-relaxed">
                  {t("everything_campus_needs_sub")}
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={100}>
              <InteractiveWorkspaces />
            </FadeInSection>
          </div>
        </div>

        {/* Key Platform Features (id="features") */}
        <div
          id="features"
          className="py-24 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(30, 27, 75, 0.25) 50%, transparent 100%)",
          }}
        >
          <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[0.75rem] mb-3">
                  {t("system_capabilities")}
                </div>
                <h3 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                  {t("powerful_features")}
                </h3>
                <p className="text-base sm:text-lg text-slate-300/80 leading-relaxed">
                  {t("powerful_features_sub")}
                </p>
              </div>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {keyPlatformFeatures.map((feature, index) => (
                <FadeInSection key={index} delay={index * 80}>
                  <div
                    className="relative h-full select-none cursor-pointer"
                    onMouseEnter={() => setHoveredFeatureIndex(index)}
                    onMouseLeave={() => setHoveredFeatureIndex(null)}
                  >
                    {/* Default Feature Card */}
                    <div className={`bg-white/5 rounded-[2rem] p-8 transition-all duration-300 border border-white/10 h-full backdrop-blur-md flex flex-col justify-start ${
                      hoveredFeatureIndex === index ? "opacity-20 blur-[1px]" : "hover:bg-white/10 hover:shadow-2xl hover:shadow-indigo-900/20 hover:-translate-y-2"
                    }`}>
                      <div className="bg-white/10 rounded-2xl w-12 h-12 flex items-center justify-center mb-6 shadow-sm border border-white/10">
                        {feature.icon}
                      </div>
                      <h4 className="text-lg font-bold text-white mb-3 tracking-tight">
                        {t(feature.title)}
                      </h4>
                      <p className="text-slate-300/70 leading-relaxed text-sm">
                        {t(feature.description)}
                      </p>
                    </div>

                    {/* Visually stunning mockup overlay when hovered */}
                    <div className={`absolute inset-0 bg-[#070612]/98 backdrop-blur-2xl rounded-[2rem] border-2 border-indigo-500/70 shadow-[0_0_35px_rgba(99,102,241,0.5)] transition-all duration-300 flex flex-col p-0 z-40 overflow-hidden ${
                      hoveredFeatureIndex === index
                        ? "opacity-100 scale-105 pointer-events-auto"
                        : "opacity-0 scale-95 pointer-events-none"
                    }`}>
                      {/* Top Window Bar (spanning full width of mockup) */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/40 border-b border-white/10 shrink-0">
                        <div className="flex gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <div className="bg-white/5 px-2 py-0.5 rounded text-[7.5px] font-mono text-slate-400 max-w-[120px] truncate shrink-0">
                          {index === 0 && "unisphere/booking"}
                          {index === 1 && "unisphere/lectures"}
                          {index === 2 && "unisphere/attendance"}
                          {index === 3 && "unisphere/tickets"}
                          {index === 4 && "unisphere/notices"}
                          {index === 5 && "unisphere/alerts"}
                          {index === 6 && "unisphere/reports"}
                          {index === 7 && "unisphere/profile"}
                        </div>
                        <div className="w-4 shrink-0" />
                      </div>

                      {/* Main Split Layout: Left Sidebar & Right Content */}
                      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
                        {/* Mini Sidebar on the left */}
                        <div className="w-9 shrink-0 flex flex-col items-center py-3.5 space-y-4 bg-slate-950/50 border-r border-white/10 h-full">
                          <GraduationCap className={`h-3.5 w-3.5 transition-colors ${index === 1 ? "text-indigo-400 drop-shadow-[0_0_4px_rgba(129,140,248,0.5)]" : "text-slate-500 opacity-40"}`} />
                          <CalendarDays className={`h-3.5 w-3.5 transition-colors ${index === 0 ? "text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]" : "text-slate-500 opacity-40"}`} />
                          <QrCode className={`h-3.5 w-3.5 transition-colors ${index === 2 ? "text-teal-400 drop-shadow-[0_0_4px_rgba(45,212,191,0.5)]" : "text-slate-500 opacity-40"}`} />
                          <Wrench className={`h-3.5 w-3.5 transition-colors ${(index === 3 || index === 5 || index === 6) ? "text-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.5)]" : "text-slate-500 opacity-40"}`} />
                          <User className={`h-3.5 w-3.5 transition-colors ${(index === 7 || index === 4) ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" : "text-slate-500 opacity-40"}`} />
                        </div>

                        {/* Right Content Area */}
                        <div className="flex-1 flex flex-col justify-between p-4 h-full overflow-hidden text-left min-h-0">
                          {index === 0 && (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex-1 flex flex-col justify-center">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold text-slate-200">Study Room 03</span>
                                  <span className="text-[7.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded-full font-bold">
                                    Available
                                  </span>
                                </div>
                                <div className="text-[8px] text-slate-400 mb-1.5 font-medium">
                                  Today, 02:00 PM - 04:00 PM
                                </div>
                                <div className="grid grid-cols-2 gap-1 mb-2">
                                  <div className="bg-white/5 border border-white/10 rounded py-0.5 text-[7.5px] text-slate-400 text-center">
                                    10:00 - 12:00
                                  </div>
                                  <div className="bg-indigo-500/20 border border-indigo-500/50 rounded py-0.5 text-[7.5px] text-indigo-300 font-bold text-center shadow-[0_0_6px_rgba(99,102,241,0.2)]">
                                    14:00 - 16:00
                                  </div>
                                </div>
                              </div>
                              <button className="w-full py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-[8px] font-black uppercase tracking-wider text-white shadow-md transition-all duration-200">
                                Confirm Booking
                              </button>
                            </div>
                          )}

                          {index === 1 && (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex-1 flex flex-col justify-center space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black text-white tracking-tight">Lectures</span>
                                  <span className="text-[6.5px] bg-indigo-500/20 text-indigo-300 px-1 rounded-full font-bold">
                                    Student
                                  </span>
                                </div>
                                <div className="bg-slate-900/60 border border-white/5 rounded-lg p-1.5 space-y-0.5">
                                  <div className="text-[7.5px] font-bold text-white leading-tight">Software Architecture</div>
                                  <div className="text-[7px] text-slate-400">Dr. Dhanaja • Room A-202</div>
                                  <div className="flex items-center justify-between bg-white/5 rounded p-0.5 border border-white/5">
                                    <div className="flex items-center gap-0.5 min-w-0">
                                      <FileText className="h-2 w-2 text-red-400 shrink-0" />
                                      <span className="text-[7px] text-slate-300 font-medium truncate max-w-[55px]">Lec_Slides.pdf</span>
                                    </div>
                                    <span className="text-[7px] text-indigo-400 font-bold hover:underline cursor-pointer shrink-0">Download</span>
                                  </div>
                                </div>
                              </div>
                              <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-1 shrink-0">
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-[7px] font-bold text-white px-1.5 py-1 rounded-md flex items-center gap-0.5 shadow-sm">
                                  <QrCode className="h-2 w-2" />
                                  <span>Check-In</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[6.5px] text-slate-400 font-medium">Feedback:</span>
                                  <div className="flex text-amber-400 text-[7px] font-bold">★★★★★</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {index === 2 && (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex-1 flex flex-col items-center justify-center relative my-1">
                                <div className="relative w-16 h-16 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center p-1.5 overflow-hidden">
                                  <QrCode className="w-12 h-12 text-teal-400 opacity-80" />
                                  <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_8px_#2dd4bf] animate-scan-line" />
                                </div>
                                <div className="text-[8px] text-slate-400 mt-2 font-medium">Scan to check-in</div>
                                <div className="text-[9px] text-teal-400 font-bold mt-1 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                                  Verified
                                </div>
                              </div>
                              <button className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[9px] font-black uppercase tracking-wider text-white shadow-md transition-all duration-200">
                                Submit Attendance
                              </button>
                            </div>
                          )}

                          {index === 3 && (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex-1 flex flex-col justify-center">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[8px] font-mono text-slate-400">#TKT-1082</span>
                                  <span className="text-[6.5px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded-full font-bold">
                                    High
                                  </span>
                                </div>
                                <h5 className="text-[10px] font-bold text-white leading-tight">Projector Failure</h5>
                                <div className="text-[7.5px] text-slate-400 mb-1">FOE Room 402</div>
                                <div className="bg-white/5 border border-white/10 rounded-md p-1 flex items-center justify-between gap-0.5">
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[6px] text-slate-500 font-bold uppercase truncate">Tech</span>
                                    <span className="text-[7.5px] text-slate-200 font-medium truncate">Kumara S.</span>
                                  </div>
                                  <div className="flex items-center gap-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.5 rounded text-[6.5px] font-bold shrink-0">
                                    <svg className="w-2 h-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span>Active</span>
                                  </div>
                                </div>
                              </div>
                              <button className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[8px] font-black uppercase tracking-wider text-white border border-white/10 transition-all duration-200">
                                Update Status
                              </button>
                            </div>
                          )}

                          {index === 4 && (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex-1 flex flex-col justify-center space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[7.5px] text-slate-500 font-bold uppercase">Notices</span>
                                  <span className="text-[6.5px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 py-0.2 rounded-full font-bold">
                                    Urgent
                                  </span>
                                </div>
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-1.5 space-y-0.5">
                                  <div className="text-[9px] font-bold text-white leading-tight">Mid-Term Exams</div>
                                  <p className="text-[7.5px] text-slate-400 leading-snug line-clamp-2">
                                    Timetables are updated. All students must download...
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[6.5px] text-slate-500 font-medium shrink-0 pt-0.5">
                                <span>By: Admin</span>
                                <span>Today, 10:15</span>
                              </div>
                            </div>
                          )}

                          {index === 5 && (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex-1 flex flex-col justify-center space-y-1">
                                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md p-1 text-left">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[7.5px] text-slate-200 font-bold truncate">Booking Approved</div>
                                    <div className="text-[6.5px] text-slate-400 truncate">Room 03 is ready</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-md p-1 text-left">
                                  <Wrench className="h-2.5 w-2.5 text-blue-400 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[7.5px] text-slate-200 font-bold truncate">Ticket Resolved</div>
                                    <div className="text-[6.5px] text-slate-400 truncate">Lab B AC repair done</div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-center text-[7px] text-slate-500 font-bold hover:text-indigo-400 cursor-pointer shrink-0 pt-0.5">
                                Mark All Read
                              </div>
                            </div>
                          )}

                          {index === 6 && (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex-1 flex flex-col justify-center space-y-1.5">
                                <div className="text-[9px] font-bold text-white leading-tight">Utilization</div>
                                <div className="space-y-1">
                                  <div>
                                    <div className="flex justify-between text-[6.5px] text-slate-400 font-medium">
                                      <span>Bookings</span>
                                      <span className="font-bold">142</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[85%]" />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex justify-between text-[6.5px] text-slate-400 font-medium">
                                      <span>Resolved</span>
                                      <span className="font-bold">94%</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full w-[94%]" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button className="w-full py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[8px] font-black uppercase tracking-wider text-white shadow-md flex items-center justify-center gap-1 transition-all duration-200 shrink-0">
                                <Download className="h-2.5 w-2.5" />
                                <span>Export PDF</span>
                              </button>
                            </div>
                          )}

                          {index === 7 && (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex-1 flex flex-col justify-center">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[9px] relative shadow-inner">
                                    D
                                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-slate-950" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold text-white leading-tight truncate">Dhanaja D.</span>
                                    <span className="text-[6px] text-indigo-400 font-bold uppercase tracking-wider">Student</span>
                                  </div>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-md p-1.5 space-y-0.5">
                                  <div className="flex justify-between text-[7px] text-slate-400">
                                    <span>Faculty:</span>
                                    <span className="font-bold text-slate-200">Computing</span>
                                  </div>
                                  <div className="flex justify-between text-[7px] text-slate-400">
                                    <span>Level:</span>
                                    <span className="font-bold text-slate-200">Year 3 Sem 1</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-center text-[6.5px] text-slate-500 font-bold shrink-0 pt-0.5">
                                Last Check-In: Active
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </div>

        {/* Why Choose UniSphere Section (id="about") */}
        <div id="about" className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeInSection>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[0.75rem] mb-3">
                  {t("our_value_proposition")}
                </div>
                <h3 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                  {t("why_choose_unisphere")}
                </h3>
                <p className="text-base sm:text-lg text-slate-300/80 leading-relaxed">
                  {t("why_choose_unisphere_sub")}
                </p>
              </div>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Card 1: Centralized Management */}
              <FadeInSection delay={0}>
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 hover:-translate-y-1.5 transition-all duration-300 h-full backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3 tracking-tight">{t("centralized_management")}</h4>
                  <p className="text-slate-300/70 text-sm leading-relaxed">
                    {t("centralized_management_desc")}
                  </p>
                </div>
              </FadeInSection>

              {/* Card 2: Role-Based Access */}
              <FadeInSection delay={100}>
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 hover:-translate-y-1.5 transition-all duration-300 h-full backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                    <Users className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3 tracking-tight">{t("role_based_access")}</h4>
                  <p className="text-slate-300/70 text-sm leading-relaxed">
                    {t("role_based_access_desc")}
                  </p>
                </div>
              </FadeInSection>

              {/* Card 3: Smart Automation */}
              <FadeInSection delay={200}>
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 hover:-translate-y-1.5 transition-all duration-300 h-full backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6">
                    <Activity className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3 tracking-tight">{t("smart_automation")}</h4>
                  <p className="text-slate-300/70 text-sm leading-relaxed">
                    {t("smart_automation_desc")}
                  </p>
                </div>
              </FadeInSection>

              {/* Card 4: Modern Experience */}
              <FadeInSection delay={300}>
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 hover:-translate-y-1.5 transition-all duration-300 h-full backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3 tracking-tight">{t("modern_experience")}</h4>
                  <p className="text-slate-300/70 text-sm leading-relaxed">
                    {t("modern_experience_desc")}
                  </p>
                </div>
              </FadeInSection>
            </div>
          </div>
        </div>

        <footer className="relative z-10 border-t border-indigo-500/20 bg-[#0f0f35]/90 backdrop-blur-3xl py-12 px-6 shadow-[0_-15px_50px_-20px_rgba(79,70,229,0.2)]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-8">
              {/* Column 1: Brand & Apps */}
              <div className="space-y-5 lg:col-span-1.2">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-1.5 rounded-xl shadow-lg shadow-indigo-500/20">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-black text-white tracking-tighter">
                    UniSphere
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                  {t("footer_tagline")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Styled App Store Badge */}
                  <a
                    href="#"
                    className="transition-transform hover:scale-105 active:scale-95 duration-300"
                  >
                    <svg
                      className="w-[120px] h-auto shadow-2xl"
                      viewBox="0 0 135 40"
                    >
                      <defs>
                        <linearGradient
                          id="badgeGradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            style={{ stopColor: "#4338ca", stopOpacity: 0.2 }}
                          />
                          <stop
                            offset="100%"
                            style={{ stopColor: "#1e1b4b", stopOpacity: 0.4 }}
                          />
                        </linearGradient>
                      </defs>
                      <rect
                        width="135"
                        height="40"
                        rx="8"
                        fill="url(#badgeGradient)"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                      />
                      <path
                        d="M21.2 24.3c-.2-3.7 1.7-6.5 5.1-8.6-1.9-2.7-4.8-4.2-8.6-4.5-3.6-.3-7.5 2.1-9 2.1-1.5 0-5-2-7.8-2C4.3 11.3 0 15.7 0 24.7c0 4 1.5 8.2 4 12.3 2.5 4.1 6 12.8 10.9 12.7 2.6-.1 4.4-1.8 7.7-1.8 3.2 0 4.9 1.8 7.8 1.8 5-.1 9.2-8.4 10.4-12.1-6.6-3.1-6.3-9.1-6.3-9.3zm-5.7-16.6c2.8-3.3 2.5-6.3 2.4-7.4-2.4.1-5.3 1.7-6.9 3.5-1.8 2-2.8 4.5-2.6 7.3 2.7.2 5.1-1.1 7.1-3.4z"
                        fill="white"
                        transform="translate(14, 10) scale(0.4)"
                      />
                      <text
                        x="44"
                        y="16"
                        fill="white"
                        style={{
                          fontSize: "7px",
                          fontWeight: "bold",
                          fontFamily: "Arial",
                          opacity: 0.7,
                        }}
                      >
                        Download on the
                      </text>
                      <text
                        x="44"
                        y="30"
                        fill="white"
                        style={{
                          fontSize: "13px",
                          fontWeight: "900",
                          fontFamily: "Arial",
                        }}
                      >
                        App Store
                      </text>
                    </svg>
                  </a>

                  {/* Styled Google Play Badge */}
                  <a
                    href="#"
                    className="transition-transform hover:scale-105 active:scale-95 duration-300"
                  >
                    <svg
                      className="w-[135px] h-auto shadow-2xl"
                      viewBox="0 0 155 40"
                    >
                      <rect
                        width="155"
                        height="40"
                        rx="8"
                        fill="url(#badgeGradient)"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                      />
                      <g transform="translate(10, 6) scale(1.1)">
                        <path
                           d="M1.3 1.6C.7 2.0 .3 2.7 .3 3.6v20.8c0 .9 .4 1.6 1.0 2.0l.1 .1L13.8 14.1v-.2L1.4 1.5l-.1 .1z"
                          fill="#00E5FF"
                        />
                        <path
                          d="M17.8 18.2l-4.0-4.0v-.2l4.0-4.0 .1 .1 4.7 2.7c1.3 .8 1.3 2.0 0 2.7l-4.7 2.7-.1 .1z"
                          fill="#FFC107"
                        />
                        <path
                          d="M1.4 26.5l12.4-12.4 4.1 4.1-12.9 7.3c-.5 .3-1.0 .3-1.4 0l-2.2-1.0 .2-.1z"
                          fill="#FF3D00"
                        />
                        <path
                          d="M1.4 1.5c.4-.3 .9-.3 1.4 0l12.9 7.3-4.1 4.1L1.4 1.5z"
                          fill="#00E676"
                        />
                      </g>
                      <text
                        x="44"
                        y="16"
                        fill="white"
                        style={{
                          fontSize: "7px",
                          fontWeight: "bold",
                          fontFamily: "Arial",
                          opacity: 0.7,
                        }}
                      >
                        GET IT ON
                      </text>
                      <text
                        x="44"
                        y="30"
                        fill="white"
                        style={{
                          fontSize: "15px",
                          fontWeight: "900",
                          fontFamily: "Arial",
                        }}
                      >
                        Google Play
                      </text>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Column 2: Explore */}
              <div>
                <h4 className="text-white text-[13px] font-black uppercase tracking-widest mb-5 opacity-80">
                  {t("explore")}
                </h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "features", key: "features" },
                    { label: "resources", key: "resources" },
                    { label: "bookings", key: "bookings" }
                  ].map((item) => (
                    <li key={item.key}>
                      <a
                        href="#"
                        className="text-slate-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                      >
                        {t(item.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: Support */}
              <div>
                <h4 className="text-white text-[13px] font-black uppercase tracking-widest mb-5 opacity-80">
                  {t("support")}
                </h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "help_center", def: "Help Center" },
                    { label: "privacy_policy", def: "Privacy Policy" },
                    { label: "contact_us", def: "Contact Us" }
                  ].map((item) => (
                    <li key={item.label}>
                      <a
                        href="#"
                        className="text-slate-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                      >
                        {t(item.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 4: Contact */}
              <div>
                <h4 className="text-white text-[13px] font-black uppercase tracking-widest mb-5 opacity-80">
                  {t("connect")}
                </h4>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
                  <a
                    href="tel:0252288430"
                    className="text-[11px] text-indigo-400 font-black tracking-tight hover:text-white transition-colors cursor-pointer"
                  >
                    023-2288-430
                  </a>
                  <div className="h-px bg-white/5"></div>
                  <a
                    href="https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&to=support@unisphere.ac.lk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 font-black tracking-tight hover:text-white transition-colors cursor-pointer"
                  >
                    support@unisphere.ac.lk
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-slate-500 text-[11px] font-medium tracking-tight">
                {t("all_rights_reserved")}
              </div>

              {/* Developer Credit */}
              <div className="flex items-center gap-2 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full group hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  {t("designed_by")}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
