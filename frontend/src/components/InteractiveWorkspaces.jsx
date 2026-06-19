import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, BookOpen, Wrench, ShieldCheck, CheckCircle2, X } from "lucide-react";

// Import local PNG assets from the assets directory
import studentImg from "../assets/student.png";
import lecImg from "../assets/lec.png";
import techImg from "../assets/tech.png";
import adminImg from "../assets/admin.png";

export default function InteractiveWorkspaces() {
  const { t } = useTranslation();
  const [activeRole, setActiveRole] = useState(null);

  // Role Metadata Config
  const roles = {
    student: {
      id: "student",
      titleKey: "student_experience",
      image: studentImg,
      icon: <GraduationCap className="h-6 w-6" />,
      activeBorderColor: "border-2 border-blue-500/80 shadow-[0_0_45px_rgba(59,130,241,0.6)]",
      iconContainerColor: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
      themeColor: "#3b82f6",
      features: [
        "student_feat_1",
        "student_feat_2",
        "student_feat_3",
        "student_feat_4",
        "student_feat_5",
        "student_feat_6",
        "student_feat_7"
      ],
      checkColor: "text-blue-400"
    },
    lecturer: {
      id: "lecturer",
      titleKey: "lecturer_workspace",
      image: lecImg,
      icon: <BookOpen className="h-6 w-6" />,
      activeBorderColor: "border-2 border-indigo-500/80 shadow-[0_0_45px_rgba(99,102,241,0.6)]",
      iconContainerColor: "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400",
      themeColor: "#6366f1",
      features: [
        "lecturer_feat_1",
        "lecturer_feat_2",
        "lecturer_feat_3",
        "lecturer_feat_4",
        "lecturer_feat_5",
        "lecturer_feat_6",
        "lecturer_feat_7"
      ],
      checkColor: "text-indigo-400"
    },
    technician: {
      id: "technician",
      titleKey: "technician_operations",
      image: techImg,
      icon: <Wrench className="h-6 w-6" />,
      activeBorderColor: "border-2 border-teal-500/80 shadow-[0_0_45px_rgba(13,148,136,0.6)]",
      iconContainerColor: "bg-teal-500/10 border border-teal-500/20 text-teal-400",
      themeColor: "#0d9488",
      features: [
        "technician_feat_1",
        "technician_feat_2",
        "technician_feat_3",
        "technician_feat_4",
        "technician_feat_5"
      ],
      checkColor: "text-teal-400"
    },
    admin: {
      id: "admin",
      titleKey: "administrative_control",
      image: adminImg,
      icon: <ShieldCheck className="h-6 w-6" />,
      activeBorderColor: "border-2 border-purple-500/80 shadow-[0_0_45px_rgba(168,85,247,0.6)]",
      iconContainerColor: "bg-purple-500/10 border border-purple-500/20 text-purple-400",
      themeColor: "#a855f7",
      features: [
        "admin_feat_1",
        "admin_feat_2",
        "admin_feat_3",
        "admin_feat_4",
        "admin_feat_5",
        "admin_feat_6",
        "admin_feat_7"
      ],
      checkColor: "text-purple-400"
    }
  };

  return (
    <div className="w-full relative py-12 flex flex-col items-center">
      {/* ==================== DESKTOP LAYOUT (Horizontal Row + Overlay HUDS) ==================== */}
      <div className="hidden lg:flex flex-row justify-around items-center w-full max-w-[1240px] min-h-[420px] select-none gap-12">
        
        {Object.values(roles).map((role) => {
          const isActive = activeRole === role.id;
          return (
            <div
              key={role.id}
              className="relative flex flex-col items-center"
              onMouseEnter={() => setActiveRole(role.id)}
              onMouseLeave={() => setActiveRole(null)}
            >
              {/* Character Image Container (Enlarged to 260px & Floating) */}
              <div 
                className={`w-[260px] h-[260px] transition-all duration-500 ${
                  role.id === "student" ? "animate-float-student" :
                  role.id === "lecturer" ? "animate-float-lecturer" :
                  role.id === "technician" ? "animate-float-technician" : "animate-float-admin"
                } ${
                  isActive ? "scale-110 drop-shadow-[0_15px_30px_rgba(255,255,255,0.08)]" : activeRole ? "opacity-30 scale-90 blur-[0.5px]" : "hover:scale-105"
                }`}
              >
                <img
                  src={role.image}
                  alt={t(role.id)}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Label underneath (Enlarged) */}
              <span className={`mt-5 text-[17px] font-black tracking-widest uppercase transition-all duration-300 ${
                isActive ? "scale-105" : "text-slate-400"
              }`} style={{ color: isActive ? role.themeColor : "" }}>
                {t(role.id)}
              </span>
              
              {/* Active Dot Indicator */}
              <div 
                className={`w-3 h-3 rounded-full mt-2 transition-all duration-300 ${
                  isActive ? "opacity-100 scale-125" : "opacity-0"
                }`} 
                style={{ 
                  backgroundColor: role.themeColor,
                  boxShadow: isActive ? `0 0 12px ${role.themeColor}` : "none"
                }} 
              />

              {/* Detail model displaying directly OVER the character image (Enlarged to 380px & Spaced) */}
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] w-[380px] bg-slate-950/98 backdrop-blur-2xl rounded-[2.5rem] p-8 flex flex-col justify-center border-2 transition-all duration-300 ease-out z-50 ${
                  role.activeBorderColor
                } ${
                  isActive 
                    ? "opacity-100 scale-100 pointer-events-auto" 
                    : "opacity-0 scale-95 pointer-events-none"
                }`}
                onMouseEnter={() => setActiveRole(role.id)}
                onMouseLeave={() => setActiveRole(null)}
              >
                <div className="flex items-center gap-3.5 mb-5 pr-2">
                  <div className={`rounded-2xl p-2.5 w-11 h-11 flex items-center justify-center ${role.iconContainerColor}`}>
                    {role.icon}
                  </div>
                  <h4 className="text-[20px] font-bold text-white tracking-tight leading-tight">{t(role.titleKey)}</h4>
                </div>
                <ul className="space-y-3">
                  {role.features.map((feat, i) => (
                    <li key={i} className="flex items-start text-[15px] text-slate-200 leading-normal">
                      <CheckCircle2 className={`h-5 w-5 ${role.checkColor} mr-3 flex-shrink-0 mt-0.5`} />
                      <span>{t(feat)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}

      </div>

      {/* ==================== MOBILE/TABLET LAYOUT ==================== */}
      <div className="block lg:hidden w-full max-w-sm px-6 select-none flex flex-col items-center">
        
        {/* Avatars in horizontal row for Mobile (Enlarged to 24px) */}
        <div className="flex justify-around items-center w-full gap-2 mb-8 bg-slate-950/40 p-4 rounded-3xl border border-white/5">
          {Object.values(roles).map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRole(activeRole === role.id ? null : role.id)}
              className={`w-24 h-24 rounded-full focus:outline-none transition-all duration-300 ${
                activeRole === role.id ? "scale-115 drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : ""
              }`}
              aria-label={t(role.titleKey)}
            >
              <img
                src={role.image}
                alt={t(role.id)}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>

        {/* Mobile details drawer popup (Enlarged) */}
        {activeRole && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 transition-all duration-300">
            <div
              className={`bg-slate-950 border ${roles[activeRole].activeBorderColor} backdrop-blur-xl rounded-[2.5rem] p-8 w-full max-w-[380px] relative shadow-2xl`}
            >
              <button
                onClick={() => setActiveRole(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3.5 mb-5 pr-6">
                <div className={`rounded-2xl p-2.5 w-11 h-11 flex items-center justify-center ${roles[activeRole].iconContainerColor}`}>
                  {roles[activeRole].icon}
                </div>
                <h4 className="text-[19px] font-bold text-white tracking-tight leading-tight">{t(roles[activeRole].titleKey)}</h4>
              </div>

              <ul className="space-y-3 pr-2 max-h-[320px] overflow-y-auto auth-scroll">
                {roles[activeRole].features.map((feat, i) => (
                  <li key={i} className="flex items-start text-[14.5px] text-slate-300 leading-normal">
                    <CheckCircle2 className={`h-4.5 w-4.5 ${roles[activeRole].checkColor} mr-3 flex-shrink-0 mt-0.5`} />
                    <span>{t(feat)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
