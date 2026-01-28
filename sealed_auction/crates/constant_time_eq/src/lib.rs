// This code is public domain.

//! This crate provides a function for comparing two equal-sized byte strings
//! in constant time.
//!
//! It is intended to be used when comparing cryptographic secrets (like MACs
//! or hashes), where allowing the time used for the comparison to depend on
//! the values derived involves a security risk (timing attacks).
//!
//! # Example
//!
//! ```
//! extern crate constant_time_eq;
//!
//! # fn main() {
//! let a: [u8; 3] = [1, 2, 3];
//! let b: [u8; 3] = [1, 2, 3];
//! let c: [u8; 3] = [1, 2, 4];
//!
//! assert!(constant_time_eq::constant_time_eq(&a, &b));
//! assert!(!constant_time_eq::constant_time_eq(&a, &c));
//! # }
//! ```
#![no_std]

/// Compares two equal-sized byte strings in constant time.
///
/// # Examples
///
/// ```
/// let a: [u8; 3] = [1, 2, 3];
/// let b: [u8; 3] = [1, 2, 3];
/// let c: [u8; 3] = [1, 2, 4];
///
/// assert!(constant_time_eq::constant_time_eq(&a, &b));
/// assert!(!constant_time_eq::constant_time_eq(&a, &c));
/// ```
#[inline]
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && constant_time_eq_ne(a, b)
}

// Compare two equal-sized byte strings in constant time.
#[inline(never)]
fn constant_time_eq_ne(a: &[u8], b: &[u8]) -> bool {
    let mut result = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}
