import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.products.findMany({
      take: 10,
    });

    const safeProducts = JSON.parse(
      JSON.stringify(products, (_, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );

    return NextResponse.json({
      success: true,
      count: products.length,
      products: safeProducts,
    });
  } catch (error) {
    console.error("Lỗi đọc products:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không đọc được dữ liệu sản phẩm.",
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      },
      { status: 500 },
    );
  }
}