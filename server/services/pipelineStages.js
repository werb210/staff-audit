// Canonical pipeline stages (order matters)
const CANON_STAGES = [
  "New",
  "In Review", 
  "Requires Documents",
  "Off to Lender",
  "Accepted",
  "Denied",
];

// Terminal stages that generally cannot be changed
const TERMINAL_STAGES = ["Accepted", "Denied"];

// Stage transition rules
const STAGE_TRANSITIONS = {
  "New": {
    "In Review": { required: ["business_name", "contact", "amount"], docs: false },
    "Requires Documents": { required: [], docs: false }
  },
  "In Review": {
    "Requires Documents": { required: [], docs: "any_missing_or_rejected" },
    "Off to Lender": { required: [], docs: "all_accepted", compliance: true },
    "Accepted": { required: [], docs: "all_accepted", internal_only: true },
    "Denied": { required: [], docs: false }
  },
  "Requires Documents": {
    "In Review": { required: [], docs: "all_accepted", auto: true },
    "Denied": { required: [], docs: false }
  },
  "Off to Lender": {
    "Accepted": { required: [], docs: false, lender_decision: "approved" },
    "Denied": { required: [], docs: false, lender_decision: "declined" }
  },
  "Accepted": {
    "Off to Lender": { admin_only: true, reason_required: true }
  },
  "Denied": {
    "In Review": { admin_only: true, reason_required: true }
  }
};

function normalizeStage(input) {
  const s = String(input || "").toLowerCase();
  if (s.includes("review")) return "In Review";
  if (s.includes("require") || s.includes("doc")) return "Requires Documents";
  if (s.includes("lender") || s.includes("sent")) return "Off to Lender";
  if (s.includes("accept") || s === "approved") return "Accepted";
  if (s.includes("deny") || s.includes("declin")) return "Denied";
  return "New";
}

function validateStageTransition(currentStage, targetStage, userRole, applicationData) {
  // Role-based access control
  if (!["admin", "staff"].includes(userRole?.toLowerCase())) {
    return { valid: false, reason: "Only admin and staff can change pipeline stages" };
  }

  // Check if target stage exists
  if (!CANON_STAGES.includes(targetStage)) {
    return { valid: false, reason: "Invalid target stage" };
  }

  // No change needed
  if (currentStage === targetStage) {
    return { valid: true, reason: "No change needed" };
  }

  // Check if transition is allowed
  const transitions = STAGE_TRANSITIONS[currentStage];
  if (!transitions || !transitions[targetStage]) {
    return { valid: false, reason: `Cannot transition from ${currentStage} to ${targetStage}` };
  }

  const rule = transitions[targetStage];

  // Admin-only transitions
  if (rule.admin_only && userRole?.toLowerCase() !== "admin") {
    return { valid: false, reason: "Admin role required for this transition" };
  }

  // Check required fields
  if (rule.required?.length > 0) {
    for (const field of rule.required) {
      if (!applicationData[field]) {
        return { valid: false, reason: `Missing required field: ${field}` };
      }
    }
  }

  // Document validation logic would go here
  // For now, we'll assume documents are valid

  return { valid: true, reason: "Transition allowed" };
}

function getNextAllowedStages(currentStage, userRole, applicationData) {
  const transitions = STAGE_TRANSITIONS[currentStage] || {};
  const allowed = [];

  for (const [targetStage, rule] of Object.entries(transitions)) {
    const validation = validateStageTransition(currentStage, targetStage, userRole, applicationData);
    allowed.push({
      stage: targetStage,
      allowed: validation.valid,
      reason: validation.reason
    });
  }

  return allowed;
}

module.exports = { 
  CANON_STAGES, 
  TERMINAL_STAGES,
  normalizeStage, 
  validateStageTransition,
  getNextAllowedStages
};