/**
 * CopperCore ERP - Database Schema Definition
 * 
 * Uses Drizzle ORM for type-safe schema definition.
 * Run `pnpm db:generate` to create migration SQL from this schema.
 */

// Core domain schemas will be defined here as we implement each module:
// - Factories and Users (Step 2-4)
// - Product Families (Step 5)
// - SKUs and Inventory (Step 6-7)  
// - Work Orders (Step 8)
// - Packing and Dispatch (Step 9-10)
// - GRN and Transfers (Step 11-12)
// - Machines and QC (Step 13-14)
// - Pricing and Invoices (Step 15)

export * from './core';

// Placeholder - actual schema definitions will be added during implementation