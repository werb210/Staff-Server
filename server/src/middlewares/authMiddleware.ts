// server/src/routes/index.ts

// PUBLIC ROUTES – must be FIRST
router.use("/health", healthRouter);
router.use("/ai", aiRouter);

// PROTECTED ROUTES
router.use(authMiddleware);
router.use("/applications", applicationsRouter);
router.use("/documents", documentsRouter);
router.use("/lenders", lendersRouter);
router.use("/notifications", notificationsRouter);

// SILO ROUTES
router.use("/:silo", siloGuard, applicationsRouter);
