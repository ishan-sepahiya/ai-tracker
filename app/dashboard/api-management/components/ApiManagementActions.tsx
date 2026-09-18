"use client";

import { useState } from "react";

import CreateOrganizationModal from "./CreateOrganizationModal";

export default function ApiManagementActions() {
  const [showCreateOrganization, setShowCreateOrganization] =
    useState(false);

  return (
    <>
      {/* Create Organization Button */}
      <button
        type="button"
        onClick={() => {
          setShowCreateOrganization(true);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-prussian-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
      >
        <span className="text-base">+</span>
        Organization
      </button>

      {/* Create Organization Modal */}
      {showCreateOrganization && (
        <CreateOrganizationModal
          onClose={() => {
            setShowCreateOrganization(false);
          }}
        />
      )}
    </>
  );
}