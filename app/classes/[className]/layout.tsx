import { Box } from "@mui/material";
import { ReactNode } from "react";
import AppNavigation from "@/components/nav-and-sidemenu/app-navigation";

const ClassPageLayout = ({
  children,
  params,
}: {
  children: ReactNode;
  params: { className: string };
}) => {
  return (
    <>
      <AppNavigation className={params.className} showClassNavigation />
      <Box
        sx={{
          marginTop: "116px",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 116px)",
          width: "100%",
        }}
      >
        {children}
      </Box>
    </>
  );
};

export default ClassPageLayout;
