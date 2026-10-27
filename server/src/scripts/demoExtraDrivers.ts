/** Extra roster drivers for the demo carrier (same password as DEMO_DRIVER_PASSWORD). */
export const extraDemoDrivers = [
  {
    email: "driver2.demo@coldi.local",
    displayName: "Nguyễn Văn An",
    vehicleLabel: "Xe lạnh 51C-123.45",
    plate: "51C-12345",
    vehicleKind: "REEFER_TRUCK" as const,
  },
  {
    email: "driver3.demo@coldi.local",
    displayName: "Trần Minh Tuấn",
    vehicleLabel: "Xe lạnh 51D-456.78",
    plate: "51D-45678",
    vehicleKind: "REEFER_TRUCK" as const,
  },
  {
    email: "driver4.demo@coldi.local",
    displayName: "Lê Hoàng Phúc",
    vehicleLabel: "Container lạnh 51E-901.23",
    plate: "51E-90123",
    vehicleKind: "REEFER_CONTAINER" as const,
  },
  {
    email: "driver5.demo@coldi.local",
    displayName: "Phạm Quốc Bảo",
    vehicleLabel: "Van lạnh 51F-334.56",
    plate: "51F-33456",
    vehicleKind: "REEFER_VAN" as const,
  },
  {
    email: "driver6.demo@coldi.local",
    displayName: "Hoàng Thị Mai",
    vehicleLabel: "Xe lạnh 51G-778.90",
    plate: "51G-77890",
    vehicleKind: "REEFER_TRUCK" as const,
  },
] as const;
