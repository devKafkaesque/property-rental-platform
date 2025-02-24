import { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Building2, Home, Hotel, Castle } from "lucide-react";
import { Property } from "@shared/schema";

interface PropertyImageCarouselProps {
  images: string[];
  type: Property["type"];
  category: Property["category"];
}

function getPropertyIcon(type: Property["type"], category: Property["category"]) {
  if (category === "luxury") return Castle;
  if (type === "apartment") return Building2;
  if (type === "villa") return Hotel;
  return Home;
}

export default function PropertyImageCarousel({ images, type, category }: PropertyImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // If no images, show gradient with icon
  if (!images || images.length === 0) {
    const PropertyIcon = getPropertyIcon(type, category);
    return (
      <div className={`
        h-[400px] rounded-lg flex items-center justify-center
        ${category === "luxury" ? "bg-gradient-to-br from-amber-100 to-amber-500" : 
          category === "standard" ? "bg-gradient-to-br from-blue-100 to-blue-500" :
          "bg-gradient-to-br from-green-100 to-green-500"}
      `}>
        <PropertyIcon className={`
          h-48 w-48 
          ${category === "luxury" ? "text-amber-700" : 
            category === "standard" ? "text-blue-700" :
            "text-green-700"}
        `} />
      </div>
    );
  }

  return (
    <div className="relative h-[400px] rounded-lg overflow-hidden">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container h-[400px]">
          {images.map((image, index) => (
            <div key={index} className="embla__slide relative flex-[0_0_100%]">
              <img
                src={image}
                alt={`Property ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 p-2 rounded-full hover:bg-background/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 p-2 rounded-full hover:bg-background/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
