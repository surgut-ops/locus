import { CreateListingWizard } from '../../../../../components/CreateListingWizard';

export default function CreateListingPage() {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">Create listing</h2>
      <p className="text-sm text-slate-600">Complete all steps to prepare your property for publication.</p>
      <CreateListingWizard />
    </div>
  );
}
