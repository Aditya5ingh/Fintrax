import { currentUser } from "@/lib/auth";
import { Account } from "@/models";
import { DEFAULT_CURRENCY } from "@/lib/preferences";
import { SettingsForm } from "@/components/settings-form";
export default async function Settings() {
  const user = await currentUser();
  if (!user) return null;
  const account = await Account.findOne({ userId: user._id });
  return (
    <>
      <div className="eyebrow mb-3">MAKE YOURSELF AT HOME</div>
      <h1 className="page-title">Profile & account settings</h1>
      <p className="muted mb-8">
        A few small details. A more personal experience.
      </p>
      <SettingsForm
        initial={{
          name: user.name,
          email: user.email,
          currency: account?.currency || DEFAULT_CURRENCY,
          timezone: account?.timezone || "UTC",
        }}
      />
    </>
  );
}
