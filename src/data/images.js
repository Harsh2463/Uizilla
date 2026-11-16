// Unsplash photos, cropped square. Swap for your own files in /public/images if you prefer.
const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=800&q=80`;

export const UNSPLASH_IMAGES = [
  { src: u("photo-1506744038136-46273834b3fb") },
  { src: u("photo-1469474968028-56623f02e42e") },
  { src: u("photo-1441974231531-c6227db76b6e") },
  { src: u("photo-1470071459604-3b5ec3a7fe05") },
  { src: u("photo-1501785888041-af3ef285b470") },
  { src: u("photo-1472214103451-9374bd1c798e") },
  { src: u("photo-1465146344425-f00d5f5c8f07") },
  { src: u("photo-1447752875215-b2761acb3c5d") },
];
