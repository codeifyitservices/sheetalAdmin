"use client";

import React from "react";
import PageHeader from "@/components/admin/layout/PageHeader";
import LookbookForm from "@/components/admin/cms/lookbook/LookbookForm";

export default function LookbooksPage() {
    return (
        <div className="min-h-screen w-full animate-in fade-in duration-500 pb-20">
            <PageHeader
                title="Lookbooks Management"
                subtitle="Manage the images for the Timeless Women Collection sliders"
            />

            <div className="mt-8 max-w-5xl mx-auto">
                <LookbookForm />
            </div>
        </div>
    );
}
