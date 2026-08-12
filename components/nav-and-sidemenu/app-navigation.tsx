"use client";

import { Button, Divider, Paper, Toolbar, Typography } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "@/components/nav-and-sidemenu/navbar";

const CLASS_NAV_HEIGHT = 52;

const AppNavigation = ({
  className,
  showClassNavigation = false,
}: {
  className?: string;
  showClassNavigation?: boolean;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const decodedClassName = decodeURIComponent(className ?? "")
    .replace(/%20/g, " ")
    .replace(/-/g, " ")
    .trim();

  const classNavigation = [
    { label: "Knowledge Graph", path: `/classes/${className}/knowledge-graph` },
    { label: "Lessons", path: `/classes/${className}/lessons` },
    { label: "Roster", path: `/classes/${className}/roster` },
    { label: "Analytics", path: `/classes/${className}/class-performance` },
    { label: "Settings", path: `/classes/${className}/class-settings` },
  ];

  return (
    <>
      <Navbar />
      {showClassNavigation && className ? (
        <Paper
          component="nav"
          square
          elevation={0}
          aria-label={`${decodedClassName} navigation`}
          sx={{
            position: "fixed",
            top: 64,
            left: 0,
            right: 0,
            height: CLASS_NAV_HEIGHT,
            zIndex: (theme) => theme.zIndex.appBar,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Toolbar
            variant="dense"
            sx={{
              minHeight: `${CLASS_NAV_HEIGHT}px !important`,
              px: 3,
              gap: 0,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                maxWidth: 280,
                pr: 3,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={decodedClassName}
            >
              {decodedClassName}
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ mr: 1.5 }} />

            {classNavigation.map((item) => {
              const active = pathname?.startsWith(item.path);

              return (
                <Button
                  key={item.path}
                  color="inherit"
                  onClick={() => router.push(item.path)}
                  aria-current={active ? "page" : undefined}
                  sx={{
                    alignSelf: "stretch",
                    minWidth: 88,
                    px: 2,
                    borderRadius: 0,
                    borderBottom: 3,
                    borderColor: active ? "primary.main" : "transparent",
                    color: active ? "primary.main" : "text.secondary",
                    fontWeight: active ? 700 : 500,
                    letterSpacing: 0,
                    textTransform: "none",
                    "&:hover": {
                      color: "text.primary",
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Toolbar>
        </Paper>
      ) : null}
    </>
  );
};

export default AppNavigation;
