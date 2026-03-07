'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { assignListingAmenities, getAmenities, type AmenityItem } from '../services/amenities.service';
import { analyzeListingImage } from '../services/ai-listing.service';
import { uploadListingImage } from '../services/listing-media.service';
import { createListing, updateListing } from '../services/listings.service';
import { StepAmenities } from './create-listing/StepAmenities';
import { StepBasicInfo } from './create-listing/StepBasicInfo';
import { StepLocation } from './create-listing/StepLocation';
import { StepPhotos, type WizardPhotoItem } from './create-listing/StepPhotos';
import { StepPricing } from './create-listing/StepPricing';
import { StepPublish } from './create-listing/StepPublish';

const AI_WIZARD_STEPS = [
  'Upload Photo',
  'AI Analysis',
  'Edit Listing',
  'Publish',
] as const;

type BasicInfoState = {
  title: string;
  description: string;
  type: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'VILLA' | 'HOTEL';
  rooms: number | null;
  guests: number | null;
};

type LocationState = {
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

type PricingState = {
  price: number | null;
  currency: string;
};

const defaultBasicInfo: BasicInfoState = {
  title: '',
  description: '',
  type: 'APARTMENT',
  rooms: null,
  guests: null,
};

const defaultLocation: LocationState = {
  city: '',
  country: '',
  latitude: null,
  longitude: null,
};

const defaultPricing: PricingState = {
  price: null,
  currency: 'RUB',
};

export function CreateListingAIWizard() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [aiPhoto, setAiPhoto] = useState<File | null>(null);
  const [aiPhotoPreview, setAiPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [listingId, setListingId] = useState<string | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfoState>(defaultBasicInfo);
  const [location, setLocation] = useState<LocationState>(defaultLocation);
  const [photos, setPhotos] = useState<WizardPhotoItem[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [pricing, setPricing] = useState<PricingState>(defaultPricing);

  const [amenities, setAmenities] = useState<AmenityItem[]>([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadAmenities = async () => {
      setAmenitiesLoading(true);
      try {
        const data = await getAmenities();
        setAmenities(data);
      } finally {
        setAmenitiesLoading(false);
      }
    };
    void loadAmenities();
  }, []);

  const handlePhotoSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    setAiPhoto(file);
    setAiPhotoPreview(URL.createObjectURL(file));
    setAiError(null);
  }, []);

  const handleRemovePhoto = useCallback(() => {
    if (aiPhotoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(aiPhotoPreview);
    }
    setAiPhoto(null);
    setAiPhotoPreview(null);
    setAiError(null);
  }, [aiPhotoPreview]);

  const handleAnalyze = useCallback(async () => {
    if (!aiPhoto) return;
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const result = await analyzeListingImage(aiPhoto);
      setBasicInfo((prev) => ({
        ...prev,
        title: result.title,
        description: result.description,
        type: result.roomType,
      }));
      setPricing((prev) => ({
        ...prev,
        price: result.suggestedPrice,
      }));
      const amenityIds = result.amenities
        .map((name) => amenities.find((a) => a.name === name)?.id)
        .filter((id): id is string => Boolean(id));
      setSelectedAmenityIds(amenityIds);
      setPhotos((prev) => {
        const existing = prev.find((p) => p.file === aiPhoto);
        if (existing) return prev;
        return [
          ...prev,
          {
            localId: crypto.randomUUID(),
            fileName: aiPhoto.name,
            file: aiPhoto,
            previewUrl: aiPhotoPreview ?? URL.createObjectURL(aiPhoto),
          },
        ];
      });
      setCurrentStep(2);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [aiPhoto, aiPhotoPreview, amenities]);

  const canContinue = useMemo(() => {
    if (currentStep === 0) return Boolean(aiPhoto);
    if (currentStep === 2) {
      return Boolean(basicInfo.title.trim() && basicInfo.description.trim() && location.city.trim() && location.country.trim());
    }
    if (currentStep === 3) return Boolean(pricing.price && pricing.price > 0);
    return true;
  }, [currentStep, aiPhoto, basicInfo, location, pricing.price]);

  const toggleAmenity = useCallback((amenityId: string) => {
    setSelectedAmenityIds((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId],
    );
  }, []);

  const handleFilesAdded = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nextItems: WizardPhotoItem[] = Array.from(files).map((file) => ({
      localId: crypto.randomUUID(),
      fileName: file.name,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...nextItems]);
  }, []);

  const handleRemoveListingPhoto = useCallback((localId: string) => {
    setPhotos((prev) => {
      const found = prev.find((item) => item.localId === localId);
      if (found?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(found.previewUrl);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  }, []);

  const ensureListingId = useCallback(async (): Promise<string> => {
    if (listingId) return listingId;
    const created = await createListing({
      title: basicInfo.title.trim() || 'Draft listing',
      description: basicInfo.description.trim() || 'Draft description',
      type: basicInfo.type,
      price: pricing.price && pricing.price > 0 ? pricing.price : 1,
      currency: pricing.currency || 'RUB',
      city: location.city.trim() || 'Draft city',
      country: location.country.trim() || 'Draft country',
      latitude: location.latitude,
      longitude: location.longitude,
      rooms: basicInfo.rooms,
      guests: basicInfo.guests,
    });
    setListingId(created.id);
    return created.id;
  }, [listingId, basicInfo, location, pricing]);

  const uploadPendingPhotos = useCallback(async (id: string) => {
    const pending = photos.filter((item) => item.file && !item.uploadedImageId);
    if (pending.length === 0) return;
    setIsUploadingPhotos(true);
    try {
      let nextPhotos = [...photos];
      for (const item of pending) {
        if (!item.file) continue;
        const uploaded = await uploadListingImage(id, item.file);
        nextPhotos = nextPhotos.map((photo) =>
          photo.localId === item.localId
            ? {
                ...photo,
                uploadedImageId: uploaded.id,
                uploadedUrl: uploaded.thumbnailUrl ?? uploaded.url,
                previewUrl: uploaded.thumbnailUrl ?? uploaded.url,
                file: undefined,
              }
            : photo,
        );
        setPhotos(nextPhotos);
      }
    } finally {
      setIsUploadingPhotos(false);
    }
  }, [photos]);

  const syncDraft = useCallback(
    async (options?: { withPhotos?: boolean; withAmenities?: boolean }) => {
      const id = await ensureListingId();
      await updateListing(id, {
        title: basicInfo.title.trim() || undefined,
        description: basicInfo.description.trim() || undefined,
        rooms: basicInfo.rooms,
        guests: basicInfo.guests,
        city: location.city.trim() || undefined,
        price: pricing.price && pricing.price > 0 ? pricing.price : undefined,
        coordinates:
          location.latitude !== null && location.longitude !== null
            ? { latitude: location.latitude, longitude: location.longitude }
            : undefined,
      });
      if (options?.withAmenities && selectedAmenityIds.length > 0) {
        await assignListingAmenities(id, selectedAmenityIds);
      }
      if (options?.withPhotos) {
        await uploadPendingPhotos(id);
      }
    },
    [
      ensureListingId,
      basicInfo,
      location,
      pricing,
      selectedAmenityIds,
      uploadPendingPhotos,
    ],
  );

  const handleNext = useCallback(async () => {
    if (currentStep === 0 && aiPhoto) {
      setCurrentStep(1);
      handleAnalyze();
      return;
    }
    if (currentStep === 2) {
      setErrorMessage(null);
      setIsSaving(true);
      try {
        await syncDraft({ withPhotos: true, withAmenities: true });
        setCurrentStep(3);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to save');
      } finally {
        setIsSaving(false);
      }
    }
  }, [currentStep, aiPhoto, handleAnalyze, syncDraft]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) return;
    setCurrentStep((prev) => Math.max(0, prev - 1));
    setAiError(null);
  }, [currentStep]);

  const handlePublish = useCallback(async () => {
    setErrorMessage(null);
    setIsPublishing(true);
    try {
      await syncDraft({ withPhotos: true, withAmenities: true });
      router.push('/dashboard/listings');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to publish');
    } finally {
      setIsPublishing(false);
    }
  }, [syncDraft, router]);

  const nextButtonText =
    currentStep === 0 ? 'Analyze with AI' : currentStep === 2 ? (isSaving ? 'Saving...' : 'Next') : '';
  const showNextButton = currentStep !== 1;

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
          {AI_WIZARD_STEPS.map((label, index) => {
            const active = index === currentStep;
            const completed = index < currentStep;
            return (
              <div
                key={label}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  active ? 'bg-slate-900 text-white' : completed ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {index + 1}. {label}
              </div>
            );
          })}
        </div>
      </div>

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5"
      >
        {currentStep === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Upload a photo of your property. AI will analyze it and generate a listing draft.
            </p>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Property photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoSelect(e.target.files)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white"
              />
            </label>
            {aiPhotoPreview && (
              <div className="space-y-2">
                <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aiPhotoPreview} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-sm font-medium text-rose-600"
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex flex-col items-center justify-center py-12">
            {isAnalyzing ? (
              <>
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
                <p className="text-lg font-medium text-slate-900">AI analyzing property</p>
                <p className="mt-1 text-sm text-slate-600">Generating title, description and amenities...</p>
              </>
            ) : aiError ? (
              <>
                <p className="text-rose-600">{aiError}</p>
                <button
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Try again
                </button>
              </>
            ) : null}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">Edit the AI-generated listing. You can change any field.</p>
            <StepBasicInfo value={basicInfo} onChange={setBasicInfo} />
            <StepLocation value={location} onChange={setLocation} />
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Photos</h3>
              <StepPhotos
                items={photos}
                onFilesAdded={handleFilesAdded}
                onRemove={handleRemoveListingPhoto}
                onReorder={setPhotos}
                isUploading={isUploadingPhotos}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Amenities</h3>
              <StepAmenities
                amenities={amenities}
                selectedAmenityIds={selectedAmenityIds}
                onToggleAmenity={toggleAmenity}
                isLoading={amenitiesLoading}
              />
            </div>
            <StepPricing value={pricing} onChange={setPricing} listingId={listingId} />
          </div>
        )}

        {currentStep === 3 && (
          <StepPublish
            title={basicInfo.title}
            description={basicInfo.description}
            city={location.city}
            country={location.country}
            price={pricing.price}
            currency={pricing.currency}
            selectedAmenitiesCount={selectedAmenityIds.length}
            photos={photos}
            isSubmitting={isPublishing}
            onPublish={handlePublish}
          />
        )}
      </motion.div>

      {(errorMessage || aiError) && currentStep !== 1 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage || aiError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0 || isAnalyzing || isSaving || isPublishing}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>

        {currentStep < 3 && showNextButton ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue || isAnalyzing || isSaving || isPublishing}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nextButtonText}
          </button>
        ) : currentStep === 3 ? (
          <span className="text-sm text-slate-500">Review and publish</span>
        ) : null}
      </div>
    </div>
  );
}
