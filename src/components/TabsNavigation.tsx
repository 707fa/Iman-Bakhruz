import { useUi } from "../hooks/useUi";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface TabsNavigationProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function TabsNavigation({ value, onValueChange }: TabsNavigationProps) {
  const { t } = useUi();

  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1 sm:w-fit">
        <TabsTrigger value="group">{t("tabs.group")}</TabsTrigger>
        <TabsTrigger value="global">{t("tabs.global")}</TabsTrigger>
        <TabsTrigger value="profile">{t("tabs.profile")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
