"use client";

import { Modal } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { IconArrowRight, IconBulb, IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DidYouKnowItem = {
  slug: string;
  title: { vi: string; en: string };
  intro: { vi: string; en: string };
  tag: { vi: string; en: string };
  images: { url: string; caption: { vi: string; en: string } }[];
};

const UNSPLASH = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const ITEMS: DidYouKnowItem[] = [
  {
    slug: "aurora",
    tag: { vi: "Thiên nhiên", en: "Nature" },
    title: { vi: "Cực quang không chỉ có màu xanh", en: "Auroras aren't only green" },
    intro: {
      vi: "Tùy vào loại khí và độ cao va chạm, bầu trời cực có thể hiện lên tím, đỏ, hồng — thậm chí vàng cam.",
      en: "Depending on the gas and altitude of the collision, polar skies can glow purple, red, pink — even amber.",
    },
    images: [
      { url: UNSPLASH("1483347756197-71ef80e95f73"), caption: { vi: "Dải xanh ngọc trên Lofoten", en: "Teal ribbons over Lofoten" } },
      { url: UNSPLASH("1517816743773-6e0fd518b4a6"), caption: { vi: "Màn tím hiếm thấy ở Iceland", en: "A rare violet veil in Iceland" } },
      { url: UNSPLASH("1532712938310-34cb3982ef74"), caption: { vi: "Vũ điệu trên Fjord", en: "A dance above the fjord" } },
      { url: UNSPLASH("1579033461380-adb47c3eb938"), caption: { vi: "Phản chiếu trên băng", en: "Mirrored on ice" } },
      { url: UNSPLASH("1531366936337-7c912a4589a7"), caption: { vi: "Cabin dưới dải sáng", en: "A cabin beneath the glow" } },
      { url: UNSPLASH("1491002052546-bf38f186af56"), caption: { vi: "Vòm đêm ở Alaska", en: "Night dome over Alaska" } },
    ],
  },
  {
    slug: "deep-ocean",
    tag: { vi: "Đại dương", en: "Ocean" },
    title: { vi: "95% đáy đại dương vẫn chưa được khám phá", en: "95% of the ocean floor is still unmapped" },
    intro: {
      vi: "Chúng ta biết về bề mặt sao Hỏa rõ hơn về đáy biển sâu — nơi sinh vật phát sáng như thiên hà mini.",
      en: "We've mapped Mars better than our own abyss — where creatures glow like tiny galaxies.",
    },
    images: [
      { url: UNSPLASH("1507525428034-b723cf961d3e"), caption: { vi: "Mặt nước lúc chớm sáng", en: "Dawn across the water" } },
      { url: UNSPLASH("1439405326854-014607f694d7"), caption: { vi: "Cá đàn dưới nắng", en: "Schools in the shafts" } },
      { url: UNSPLASH("1518399681705-1c1a55e5e883"), caption: { vi: "Rạn san hô mềm", en: "Soft coral garden" } },
      { url: UNSPLASH("1519046904884-53103b34b206"), caption: { vi: "Sóng vỗ Thái Bình Dương", en: "Pacific breakers" } },
      { url: UNSPLASH("1544551763-46a013bb70d5"), caption: { vi: "Nước lam ngọc", en: "Turquoise shallows" } },
      { url: UNSPLASH("1439066615861-d1af74d74000"), caption: { vi: "Bọt sóng và cát", en: "Foam and sand" } },
    ],
  },
  {
    slug: "cosmos",
    tag: { vi: "Vũ trụ", en: "Cosmos" },
    title: { vi: "Có nhiều ngôi sao hơn mọi hạt cát trên Trái Đất", en: "More stars than grains of sand on Earth" },
    intro: {
      vi: "Ước tính vũ trụ chứa khoảng 10²² ngôi sao — gấp hàng chục lần tổng cát trên mọi bãi biển gộp lại.",
      en: "The universe holds roughly 10²² stars — tens of times more than every grain of sand on every beach.",
    },
    images: [
      { url: UNSPLASH("1446776653964-20c1d3a81b06"), caption: { vi: "Dải Ngân Hà qua đồi", en: "Milky Way over the hills" } },
      { url: UNSPLASH("1419242902214-272b3f66ee7a"), caption: { vi: "Trăng rằm trên đại dương", en: "Full moon above the sea" } },
      { url: UNSPLASH("1506318137071-a8e063b4bec0"), caption: { vi: "Tinh vân màu hồng", en: "A rose-pink nebula" } },
      { url: UNSPLASH("1532453288672-3a27e9be9efd"), caption: { vi: "Lều dưới sao", en: "Tent under the stars" } },
      { url: UNSPLASH("1534796636912-3b95b3ab5986"), caption: { vi: "Trời đêm nguyên bản", en: "An untouched night sky" } },
      { url: UNSPLASH("1465101046530-73398c7f28ca"), caption: { vi: "Dải ngân hà tím", en: "Violet galactic arm" } },
    ],
  },
  {
    slug: "mountains",
    tag: { vi: "Địa chất", en: "Geology" },
    title: { vi: "Dãy Himalaya vẫn đang cao thêm mỗi năm", en: "The Himalayas are still rising each year" },
    intro: {
      vi: "Mảng Ấn Độ xô vào mảng Á-Âu khoảng 5 cm/năm — đẩy Everest lên cao thêm vài milimet mỗi mùa.",
      en: "The Indian plate presses north at ~5 cm/year — nudging Everest a few millimeters taller each season.",
    },
    images: [
      { url: UNSPLASH("1464822759023-fed622ff2c3b"), caption: { vi: "Mặt trời chạm đỉnh", en: "Sunlight on a ridge" } },
      { url: UNSPLASH("1506905925346-21bda4d32df4"), caption: { vi: "Hồ gương trong núi", en: "A mirror lake in the alpine" } },
      { url: UNSPLASH("1519681393784-d120267933ba"), caption: { vi: "Núi phủ tuyết đầu mùa", en: "First snow on the peaks" } },
      { url: UNSPLASH("1454496522488-7a8e488e8606"), caption: { vi: "Sương sớm trên thung", en: "Morning mist over the valley" } },
      { url: UNSPLASH("1483728642387-6c3bdd6c93e5"), caption: { vi: "Đường mòn dọc sườn núi", en: "Trail along the slope" } },
      { url: UNSPLASH("1486870591958-9b9d0d1dda99"), caption: { vi: "Dãy núi tím chiều muộn", en: "Purple ridges at dusk" } },
    ],
  },
  {
    slug: "flora",
    tag: { vi: "Thực vật", en: "Plants" },
    title: { vi: "Hoa anh túc xanh thật sự tồn tại", en: "Blue poppies really exist" },
    intro: {
      vi: "Meconopsis mọc trên vùng cao Himalaya — sắc xanh đến mức nhiều người nghĩ là chỉnh ảnh.",
      en: "Meconopsis blooms high in the Himalayas — a blue so vivid people assume it's edited.",
    },
    images: [
      { url: UNSPLASH("1490750967868-88aa4486c946"), caption: { vi: "Hoa tulip buổi sáng", en: "Tulips at sunrise" } },
      { url: UNSPLASH("1465447142348-e9952c393450"), caption: { vi: "Cánh đồng hoa dại", en: "A field of wildflowers" } },
      { url: UNSPLASH("1485955900006-10f4d324d411"), caption: { vi: "Hoa hồng tím nhạt", en: "Pale violet roses" } },
      { url: UNSPLASH("1457089328109-e5d9bd499191"), caption: { vi: "Hoa cẩm chướng", en: "Delicate carnations" } },
      { url: UNSPLASH("1518621736915-f3b1c41bfd00"), caption: { vi: "Lavender nở rộ", en: "Lavender in bloom" } },
      { url: UNSPLASH("1508739773434-c26b3d09e071"), caption: { vi: "Hoa cúc dưới nắng", en: "Daisies in the sun" } },
    ],
  },
  {
    slug: "sand-dunes",
    tag: { vi: "Sa mạc", en: "Desert" },
    title: { vi: "Cát sa mạc có thể hát", en: "Desert sand can actually sing" },
    intro: {
      vi: "Ở một số đồi cát, các hạt cùng kích thước trượt lên nhau tạo nên âm thanh ngân như vĩ cầm.",
      en: "On certain dunes, equal-sized grains slide against each other and hum like a cello.",
    },
    images: [
      { url: UNSPLASH("1509316785289-025f5b846b35"), caption: { vi: "Cồn cát Namib", en: "Namibian dunes" } },
      { url: UNSPLASH("1473580044384-7ba9967e16a0"), caption: { vi: "Bóng dài chiều muộn", en: "Long shadows at dusk" } },
      { url: UNSPLASH("1518002171953-a080ee817e1f"), caption: { vi: "Những đường cong vô tận", en: "Endless curves" } },
      { url: UNSPLASH("1547234935-80c7145ec969"), caption: { vi: "Lạc đà trên cồn", en: "Camels on the ridge" } },
      { url: UNSPLASH("1510312305653-8ed496efae75"), caption: { vi: "Bầu trời cam", en: "Amber sky" } },
      { url: UNSPLASH("1489493887464-892be6d1daae"), caption: { vi: "Sa mạc ban đêm", en: "Desert nightscape" } },
    ],
  },
];

export function DidYouKnow() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState<DidYouKnowItem | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const tr = useCallback(
    (v: { vi: string; en: string }) => (lang === "en" ? v.en : v.vi),
    [lang],
  );

  const close = useCallback(() => {
    setLightbox(null);
    setActive(null);
  }, []);

  const next = useCallback(() => {
    if (active == null || lightbox == null) return;
    setLightbox((i) => (i == null ? 0 : (i + 1) % active.images.length));
  }, [active, lightbox]);

  const prev = useCallback(() => {
    if (active == null || lightbox == null) return;
    setLightbox((i) => (i == null ? 0 : (i - 1 + active.images.length) % active.images.length));
  }, [active, lightbox]);

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, next, prev]);

  return (
    <section className="bz-sec dyk-sec" aria-labelledby="dyk-h2">
      <header className="bz-sec-head">
        <h2 id="dyk-h2" className="dyk-h2">
          <IconBulb size={18} stroke={1.8} />
          {t("blog_dyk_title")}
        </h2>
        <span className="dyk-sub">{t("blog_dyk_sub")}</span>
      </header>

      <div className="dyk-grid">
        {ITEMS.map((it) => (
          <button
            key={it.slug}
            type="button"
            className="dyk-card"
            onClick={() => {
              setActive(it);
              setLightbox(null);
            }}
          >
            <span className="dyk-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.images[0].url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              <span className="dyk-count">{it.images.length}</span>
            </span>
            <span className="dyk-body">
              <span className="dyk-tag">{tr(it.tag)}</span>
              <span className="dyk-title">{tr(it.title)}</span>
              <span className="dyk-intro">{tr(it.intro)}</span>
              <span className="dyk-cta">
                {t("blog_dyk_open")} <IconArrowRight size={14} stroke={2} />
              </span>
            </span>
          </button>
        ))}
      </div>

      <Modal
        open={active != null}
        onClose={close}
        size="xl"
        closeOnEsc={lightbox == null}
        closeOnOverlay={lightbox == null}
        title={active ? tr(active.title) : null}
        description={active ? tr(active.intro) : null}
      >
        {active && (
          <div className="dyk-gallery">
            {active.images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                className="dyk-gal-item"
                onClick={() => setLightbox(i)}
                aria-label={tr(img.caption)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={tr(img.caption)} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                <span className="dyk-gal-cap">{tr(img.caption)}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {active &&
        lightbox != null &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="dyk-lightbox"
            role="dialog"
            aria-modal="true"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className="dyk-lb-btn dyk-lb-close"
              aria-label={t("blog_dyk_close")}
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
            >
              <IconX size={20} stroke={2} />
            </button>
            <button
              type="button"
              className="dyk-lb-btn dyk-lb-prev"
              aria-label={t("blog_dyk_prev")}
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
            >
              <IconChevronLeft size={28} stroke={2} />
            </button>
            <figure className="dyk-lb-figure" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.images[lightbox].url}
                alt={tr(active.images[lightbox].caption)}
                referrerPolicy="no-referrer"
              />
              <figcaption>
                <span>{tr(active.images[lightbox].caption)}</span>
                <span className="dyk-lb-count">
                  {lightbox + 1} / {active.images.length}
                </span>
              </figcaption>
            </figure>
            <button
              type="button"
              className="dyk-lb-btn dyk-lb-next"
              aria-label={t("blog_dyk_next")}
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
            >
              <IconChevronRight size={28} stroke={2} />
            </button>
          </div>,
          document.body,
        )}
    </section>
  );
}
