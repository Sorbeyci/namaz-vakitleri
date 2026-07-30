import { useCallback, useState } from "react";
import { nearestCity } from "../../lib/cities";
import { useToast } from "../../components/ui";
import { useTimes } from "../prayer-times/TimesContext";

/**
 * Cihaz konumundan en yakın il merkezini bulup şehir olarak seçer.
 * Konum izni yalnızca kullanıcı butona dokunduğunda istenir; koordinatlar
 * cihaz dışına gönderilmez (eşleşme 81 il merkezine göre yerelde yapılır).
 */
export function useLocateCity() {
  const { selectCity } = useTimes();
  const toast = useToast();
  const [locating, setLocating] = useState(false);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast("Bu cihazda konum desteği yok.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
        selectCity(city.slug);
        toast(`Konumuna göre şehir seçildi: ${city.name}`);
      },
      (err) => {
        setLocating(false);
        toast(
          err.code === err.PERMISSION_DENIED
            ? "Konum izni verilmedi. Şehrini listeden seçebilirsin."
            : "Konum alınamadı. Şehrini listeden seçebilirsin.",
        );
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }, [selectCity, toast]);

  return { locate, locating };
}
