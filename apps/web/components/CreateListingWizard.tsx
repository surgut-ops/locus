'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { assignListingAmenities, getAmenities, type AmenityItem } from '../services/amenities.service';
import { uploadListingImage } from '../services/listing-media.service';
import { createListing, updateListing } from '../services/listings.service';
import { StepAmenities } from './create-listing/StepAmenities';
import { StepBasicInfo } from './create-listing/StepBasicInfo';
import { StepLocation } from './create-listing/StepLocation';
import { StepPhotos, type WizardPhotoItem } from './create-listing/StepPhotos';
import { StepPricing } from './create-listing/StepPricing';
import { StepPublish } from './create-listing/StepPublish';

const WIZARD_STORAGE_KEY = 'locus_create_listing_wizard_v1';

const STEPS = [
  'Basic info',
  'Location',
  'Photos',
  'Amenities',
  'Pricing',
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

type PersistedState = {
  currentStep: number;
  listingId: string | null;
  basicInfo: BasicInfoState;
  location: LocationState;
  photos: Array<Omit<WizardPhotoItem, 'file'>>;
  selectedAmenityIds: string[];
  pricing: PricingState;
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

export function CreateListingWizard() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
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
    if (typeof window === 'undefined') {
      return;
    }
    const savedRaw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!savedRaw) {
      return;
    }
    try {
      const saved = JSON.parse(savedRaw) as PersistedState;
      setCurrentStep(Math.min(saved.currentStep ?? 0, STEPS.length - 1));
      setListingId(saved.listingId ?? null);
      setBasicInfo(saved.basicInfo ?? defaultBasicInfo);
      setLocation(saved.location ?? defaultLocation);
      setPhotos(saved.photos ?? []);
      setSelectedAmenityIds(saved.selectedAmenityIds ?? []);
      setPricing(saved.pricing ?? defaultPricing);
    } catch {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const persisted: PersistedState = {
      currentStep,
      listingId,
      basicInfo,
      location,
      photos: photos
        .filter((item) => item.uploadedImageId || !item.previewUrl.startsWith('blob:'))
        .map((item) => ({
          localId: item.localId,
          previewUrl: item.previewUrl,
          fileName: item.fileName,
          uploadedImageId: item.uploadedImageId,
          uploadedUrl: item.uploadedUrl,
        })),
      selectedAmenityIds,
      pricing,
    };
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(persisted));
  }, [currentStep, listingId, basicInfo, location, photos, selectedAmenityIds, pricing]);

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

  const canContinue = useMemo(() => {
    if (currentStep === 0) {
      return Boolean(basicInfo.title.trim() && basicInfo.description.trim());
    }
    if (currentStep === 1) {
      return Boolean(location.city.trim() && location.country.trim());
    }
    if (currentStep === 4) {
      return Boolean(pricing.price && pricing.price > 0);
    }
    return true;
  }, [currentStep, basicInfo.title, basicInfo.description, location.city, location.country, pricing.price]);

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const nextItems: WizardPhotoItem[] = Array.from(files).map((file) => ({
      localId: crypto.randomUUID(),
      fileName: file.name,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...nextItems]);
  };

  const handleRemovePhoto = (localId: string) => {
    setPhotos((prev) => {
      const found = prev.find((item) => item.localId === localId);
      if (found?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(found.previewUrl);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenityIds((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId],
    );
  };

  const ensureListingId = async (): Promise<string> => {
    if (listingId) {
      return listingId;
    }

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
  };

  const uploadPendingPhotos = async (id: string) => {
    const pending = photos.filter((item) => item.file && !item.uploadedImageId);
    if (pending.length === 0) {
      return;
    }

    setIsUploadingPhotos(true);
    try {
      let nextPhotos = [...photos];
      for (const item of pending) {
        if (!item.file) {
          continue;
        }
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
  };

  const syncDraft = async (options?: { withPhotos?: boolean; withAmenities?: boolean }) => {
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
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : undefined,
    });

    if (options?.withAmenities && selectedAmenityIds.length > 0) {
      await assignListingAmenities(id, selectedAmenityIds);
    }

    if (options?.withPhotos) {
      await uploadPendingPhotos(id);
    }
  };

  const handleNext = async () => {
    if (!canContinue || currentStep >= STEPS.length - 1) {
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);
    try {
      await syncDraft({
        withPhotos: currentStep >= 2,
        withAmenities: currentStep >= 3,
      });
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save step');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = async () => {
    if (currentStep === 0) {
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);
    try {
      await syncDraft({
        withPhotos: currentStep >= 2,
        withAmenities: currentStep >= 3,
      });
      setCurrentStep((prev) => Math.max(0, prev - 1));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save step');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setErrorMessage(null);
    setIsPublishing(true);
    try {
      await syncDraft({ withPhotos: true, withAmenities: true });
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      router.push('/dashboard/listings');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to publish listing');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
          {STEPS.map((label, index) => {
            const active = index === currentStep;
            const completed = index < currentStep;
            return (
              <div
                key={label}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  active
                    ? 'bg-slate-900 text-white'
                    : completed
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-100 text-slate-500'
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
        {currentStep === 0 && <StepBasicInfo value={basicInfo} onChange={setBasicInfo} />}
        {currentStep === 1 && <StepLocation value={location} onChange={setLocation} />}
        {currentStep === 2 && (
          <StepPhotos
            items={photos}
            onFilesAdded={handleFilesAdded}
            onRemove={handleRemovePhoto}
            onReorder={setPhotos}
            isUploading={isUploadingPhotos}
          />
        )}
        {currentStep === 3 && (
          <StepAmenities
            amenities={amenities}
            selectedAmenityIds={selectedAmenityIds}
            onToggleAmenity={toggleAmenity}
            isLoading={amenitiesLoading}
          />
        )}
        {currentStep === 4 && (
          <StepPricing
            value={pricing}
            onChange={setPricing}
            listingId={listingId}
          />
        )}
        {currentStep === 5 && (
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

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0 || isSaving || isPublishing}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Назад
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue || isSaving || isPublishing}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Далее'}
          </button>
        ) : (
          <span className="text-sm text-slate-500">Review and publish your listing</span>
        )}
      </div>
    </div>
  );
}
