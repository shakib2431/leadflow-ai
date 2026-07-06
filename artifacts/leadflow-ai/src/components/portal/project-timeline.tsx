export function ProjectTimeline({ stage }: { stage: string }) {
  const stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
  const currentIndex = stages.indexOf(stage);
  return (
    <div className="bg-[#111827] border border-white/10 rounded-3xl p-8 my-8">
      <h2 className="text-xl font-medium mb-6">Project Progress</h2>
      <div className="flex justify-between items-center relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10" />
        {stages.map((s, index) => (
          <div key={s} className="relative z-10 flex flex-col items-center">
            <div className={`w-4 h-4 rounded-full ${index <= currentIndex ? 'bg-emerald-500' : 'bg-white/10'}`} />
            <span className="text-[10px] mt-3 uppercase text-white/40">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}