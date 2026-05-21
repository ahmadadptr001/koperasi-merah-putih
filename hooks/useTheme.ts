import { useEffect, useState } from "react";

export const useTheme = () => {
  const [theme, setTheme] = useState<string>("light");
  useEffect(() => {
    const theme_local = localStorage.getItem("theme");
    setTheme(theme_local as string);
  }, []);

  return { theme, setTheme };
};
