import { CreateListingAIWizard } from '../../../../../components/CreateListingAIWizard';

export default function CreateListingAIPage() {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">Create listing with AI</h2>
      <p className="text-sm text-slate-600">
        Upload a photo of your property and AI will generate a listing draft for you.
      </p>
      <CreateListingAIWizard />
    </div>
  );
}
