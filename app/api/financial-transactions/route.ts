export async function GET(req: NextRequest) {
  try {
    await requireAdminOrPengurus();

    const url = new URL(req.url);
    const { page, pageSize, from, to } = parsePagination(url);
    const txType = url.searchParams.get("type");
    const category = url.searchParams.get("category");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("financial_transactions")
      .select("*", { count: "exact" });

    if (txType) query = query.eq("transaction_type", txType);
    if (category) query = query.eq("category", category);
    if (dateFrom) query = query.gte("transaction_date", dateFrom);
    if (dateTo) query = query.lte("transaction_date", dateTo);

    const { data, error, count } = await query
      .order("transaction_date", { ascending: false })
      .range(from, to);

    if (error) return errorResponse(error.message);

    return successResponse({
      data,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
