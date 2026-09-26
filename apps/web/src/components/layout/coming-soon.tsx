import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";

/** Temporary screen for routes that are planned in the roadmap but not designed yet. */
export function ComingSoon({ title, description, icon = "clock", backHref, backLabel }: { title: string; description: string; icon?: IconName; backHref: string; backLabel: string }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="flex max-w-lg flex-col items-center gap-5 rounded-3xl bg-white p-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-teal-100 text-teal-dark">
          <Icon name={icon} size={28} />
        </span>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="leading-relaxed text-navy-soft">{description}</p>
        <ButtonLink href={backHref} variant="teal">{backLabel}</ButtonLink>
      </div>
    </div>
  );
}
