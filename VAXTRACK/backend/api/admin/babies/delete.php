<?php
// Direct file endpoint used by the Admin/BHW Directory delete action.
// This prevents deployments without clean URL rewriting from returning
// "Route not found" for /api/admin/babies/:id while still reusing the
// single backend delete implementation and database connection.
require __DIR__ . '/../../../babies/delete.php';
