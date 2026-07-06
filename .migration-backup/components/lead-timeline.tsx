interface TimelineItem {
  type: string;
  text: string;
  date: string;
}

export default function LeadTimeline({
  items,
}: {
  items: TimelineItem[];
}) {
  return (
    <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">

      <h2 className="text-2xl font-semibold mb-6">
        Timeline
      </h2>

      <div className="space-y-6">

        {items.map((item, index) => (
          <div
            key={index}
            className="flex gap-4"
          >
            <div className="w-3 h-3 rounded-full bg-violet-500 mt-2" />

            <div>
              <p className="font-medium">
                {item.type}
              </p>

              <p className="text-white/70 text-sm mt-1">
                {item.text}
              </p>

              <p className="text-white/30 text-xs mt-2">
                {new Date(
                  item.date
                ).toLocaleString()}
              </p>
            </div>
          </div>
        ))}

      </div>

    </div>
  );
}