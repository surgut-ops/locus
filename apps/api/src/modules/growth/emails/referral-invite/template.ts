export function renderReferralInviteTemplate(input: { referrerName: string; referralLink: string }): string {
  return `${input.referrerName} invited you to LOCUS. Join using this link: ${input.referralLink}`;
}
