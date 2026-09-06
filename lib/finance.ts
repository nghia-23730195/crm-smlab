import { prisma } from "@/lib/prisma";

export async function getNextTransactionCode(
  organizationId: string,
): Promise<string> {
  try {
    const allTransactions = await prisma.transactions.findMany({
      where: {
        organization_id: organizationId,
      },
      select: {
        transaction_code: true,
      },
    });

    let maxNum = 0;
    for (const t of allTransactions) {
      if (!t.transaction_code) continue;
      const match = t.transaction_code.match(/(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = Math.max(maxNum + 1, allTransactions.length + 1);
    return `GD-${String(nextNum).padStart(3, "0")}`;
  } catch (err) {
    console.error("Error calculating next transaction code:", err);
    return `GD-${Date.now().toString().slice(-4)}`;
  }
}
