type ClaimPageProps = {
  params: Promise<{ claimId: string }>;
};

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { claimId } = await params;

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}>
      <h1>Claim Placeholder</h1>
      <p>Claim ID: {claimId}</p>
      <p>Use GET/PATCH /api/claim/{claimId} to fetch or update claim bank information.</p>
    </main>
  );
}
