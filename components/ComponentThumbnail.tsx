"use client";

import { useState } from "react";

type ComponentThumbnailProps = {
  imageUrl?: string | null;
  name: string;
  category?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

type IllustrationConfig = {
  icon: string;
  bgGradient: string;
  border: string;
  textColor: string;
  label: string;
};

function getComponentIllustration(name: string, category?: string | null): IllustrationConfig {
  const text = `${name} ${category || ""}`.toLowerCase();

  // 1. Vi điều khiển / Mạch phát triển (MCU / Boards)
  if (
    text.includes("arduino") ||
    text.includes("esp32") ||
    text.includes("esp8266") ||
    text.includes("stm32") ||
    text.includes("raspberry") ||
    text.includes("pic") ||
    text.includes("mạch") ||
    text.includes("board") ||
    text.includes("cpu")
  ) {
    return {
      icon: "🧠",
      bgGradient: "from-cyan-50 to-blue-100",
      border: "border-blue-200",
      textColor: "text-blue-700",
      label: "MCU / Mạch",
    };
  }

  // 2. Cảm biến (Sensors)
  if (
    text.includes("cảm biến") ||
    text.includes("sensor") ||
    text.includes("sr04") ||
    text.includes("dht11") ||
    text.includes("dht22") ||
    text.includes("mq") ||
    text.includes("siêu âm") ||
    text.includes("hồng ngoại") ||
    text.includes("nhiệt độ") ||
    text.includes("đo")
  ) {
    return {
      icon: "📡",
      bgGradient: "from-amber-50 to-orange-100",
      border: "border-amber-200",
      textColor: "text-amber-700",
      label: "Cảm biến",
    };
  }

  // 3. Động cơ & Cơ khí (Motors & Actuators)
  if (
    text.includes("servo") ||
    text.includes("động cơ") ||
    text.includes("motor") ||
    text.includes("step") ||
    text.includes("bước") ||
    text.includes("sg90") ||
    text.includes("mg996") ||
    text.includes("bánh xe") ||
    text.includes("khung") ||
    text.includes("trục")
  ) {
    return {
      icon: "⚙️",
      bgGradient: "from-purple-50 to-indigo-100",
      border: "border-purple-200",
      textColor: "text-purple-700",
      label: "Động cơ",
    };
  }

  // 4. Nguồn & Pin (Power & Battery)
  if (
    text.includes("pin") ||
    text.includes("nguồn") ||
    text.includes("battery") ||
    text.includes("sạc") ||
    text.includes("tp4056") ||
    text.includes("lm2596") ||
    text.includes("hạ áp") ||
    text.includes("tăng áp") ||
    text.includes("adapter") ||
    text.includes("18650")
  ) {
    return {
      icon: "⚡",
      bgGradient: "from-emerald-50 to-teal-100",
      border: "border-emerald-200",
      textColor: "text-emerald-700",
      label: "Nguồn / Pin",
    };
  }

  // 5. Màn hình & LED (Displays & Output)
  if (
    text.includes("lcd") ||
    text.includes("oled") ||
    text.includes("màn hình") ||
    text.includes("display") ||
    text.includes("led") ||
    text.includes("ma trận") ||
    text.includes("loa") ||
    text.includes("buzzer") ||
    text.includes("còi")
  ) {
    return {
      icon: "🖥️",
      bgGradient: "from-rose-50 to-pink-100",
      border: "border-rose-200",
      textColor: "text-rose-700",
      label: "Hiển thị",
    };
  }

  // 6. Truyền thông & Không dây (Wireless & Communication)
  if (
    text.includes("bluetooth") ||
    text.includes("wifi") ||
    text.includes("rfid") ||
    text.includes("lora") ||
    text.includes("nrf24") ||
    text.includes("sim") ||
    text.includes("gps") ||
    text.includes("thu phát")
  ) {
    return {
      icon: "📶",
      bgGradient: "from-sky-50 to-indigo-100",
      border: "border-sky-200",
      textColor: "text-sky-700",
      label: "Không dây",
    };
  }

  // 7. Relay & Đóng cắt
  if (
    text.includes("relay") ||
    text.includes("rơ le") ||
    text.includes("công tắc") ||
    text.includes("nút nhấn") ||
    text.includes("switch")
  ) {
    return {
      icon: "🔌",
      bgGradient: "from-yellow-50 to-amber-100",
      border: "border-yellow-200",
      textColor: "text-yellow-800",
      label: "Đóng cắt",
    };
  }

  // 8. Dây nối, Breadboard & Phụ kiện cơ bản (Passives & Accessories)
  if (
    text.includes("dây") ||
    text.includes("cable") ||
    text.includes("breadboard") ||
    text.includes("test board") ||
    text.includes("điện trở") ||
    text.includes("tụ") ||
    text.includes("resistor") ||
    text.includes("vít")
  ) {
    return {
      icon: "🧰",
      bgGradient: "from-slate-100 to-slate-200",
      border: "border-slate-300",
      textColor: "text-slate-700",
      label: "Phụ kiện",
    };
  }

  // Mặc định
  return {
    icon: "📦",
    bgGradient: "from-slate-50 to-blue-50",
    border: "border-slate-200",
    textColor: "text-slate-700",
    label: "Linh kiện",
  };
}

const sizeClasses = {
  sm: "h-9 w-9 text-base rounded-lg",
  md: "h-11 w-11 text-xl rounded-xl",
  lg: "h-14 w-14 text-2xl rounded-2xl",
  xl: "h-20 w-20 text-4xl rounded-2xl",
};

export default function ComponentThumbnail({
  imageUrl,
  name,
  category,
  size = "md",
  className = "",
}: ComponentThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const config = getComponentIllustration(name, category);
  const sizeClass = sizeClasses[size];

  if (imageUrl && !imgError) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden border border-slate-200 bg-white shadow-2xs transition group-hover:scale-105 ${sizeClass} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover object-center transition duration-300 hover:scale-110"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      title={`${config.label}: ${name}`}
      className={`relative shrink-0 flex items-center justify-center bg-gradient-to-br border shadow-2xs transition duration-200 group-hover:scale-105 ${config.bgGradient} ${config.border} ${sizeClass} ${className}`}
    >
      <span className="select-none transition-transform duration-200 group-hover:scale-110">
        {config.icon}
      </span>
    </div>
  );
}
