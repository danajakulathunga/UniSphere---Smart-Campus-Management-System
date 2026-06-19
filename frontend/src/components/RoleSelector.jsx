import React from "react";

const ROLE_OPTIONS = ["USER", "ADMIN", "TECHNICIAN"];

const RoleSelector = ({
  value,
  onChange,
  className = "",
  accentButtonClassName = "from-blue-600 to-indigo-600",
  accentShadowClassName = "shadow-blue-200",
  accentRingClassName = "ring-blue-500",
}) => {
  const selectedIndex = Math.max(0, ROLE_OPTIONS.indexOf(value));

  const handleKeyDown = (event) => {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();

    if (event.key === "Home") {
      onChange(ROLE_OPTIONS[0]);
      return;
    }

    if (event.key === "End") {
      onChange(ROLE_OPTIONS[ROLE_OPTIONS.length - 1]);
      return;
    }

    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (selectedIndex + direction + ROLE_OPTIONS.length) % ROLE_OPTIONS.length;

    onChange(ROLE_OPTIONS[nextIndex]);
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        role="radiogroup"
        aria-label="Select role"
        onKeyDown={handleKeyDown}
        className="mx-auto grid w-full max-w-md grid-cols-3 gap-1 rounded-full border border-white/10 bg-white/10 p-1 shadow-sm"
      >
        {ROLE_OPTIONS.map((role) => {
          const isActive = value === role;

          return (
            <button
              key={role}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(role.trim())}
              className={`flex w-full items-center justify-center rounded-full px-3 py-2 text-center text-[11px] font-black tracking-[0.12em] outline-none transition duration-300 sm:text-xs ${
                isActive
                  ? `scale-[1.03] bg-gradient-to-r ${accentButtonClassName} text-white shadow-md ${accentShadowClassName}`
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              } focus-visible:ring-2 focus-visible:${accentRingClassName} focus-visible:ring-offset-2`}
            >
              {role}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoleSelector;
