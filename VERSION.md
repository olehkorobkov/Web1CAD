# Web1CAD Version Information

**Current Version**: 0.250808 Beta  
**Release Date**: August 8, 2025  
**Version Format**: YY.MMDD (Year.MonthDay)

## Version History
- **0.250808** (August 8, 2025) - UI Enhancement & Polygon Tool Redesign
  - Fixed text scaling to behave as geometric shapes
  - Implemented professional CAD-style white-to-black color conversion for PDF export
  - Redesigned polygon tool with separate buttons for inscribed/circumscribed types
  - Updated polygon icons with intuitive geometric symbols (⌼ and ⌾)
  - Fixed LWT button styling to match toolbar theme
  - Enhanced button initialization system for proper active states
  - Streamlined polygon workflow from 4 steps to 3 steps
  - Code cleanup and English-only comments
  - Removed all third-party software references
  - Cleaned up deprecated CSS styles and functions
  - Removed New Drawing button from toolbar
  - Full internationalization to English language
- **0.250805** (August 5, 2025) - UI Improvements & Coordinate System Enhancement
  - Enhanced rotate function with preview and angle input
  - Fixed LWT button styling and behavior
  - Improved coordinate system support for negative values
  - Updated polyline/PLINE command support
  - Adjusted default zoom to 3.7x for realistic millimeter scale
- **0.250804** (August 4, 2025) - Technical Documentation & System Requirements
  - Added comprehensive technical system requirements
  - Updated browser compatibility specifications
  - Enhanced memory and performance requirements
  - Detailed hardware recommendations
- **0.250803** (August 3, 2025) - PDF Export Integration (Beta)
  - Professional PDF export with vector graphics
  - Area selection with real-time preview
  - Multiple paper formats and custom scaling
  - Advanced export options and settings
- **0.250801** (August 1, 2025) - Major optimization release
  - Coordinate-based command system implementation
  - Code optimization reducing duplication by 67%
  - Enhanced command processing with regex patterns
  - Improved focus management and UI behavior
  - Advanced arc creation with two-point format

## Version Numbering System
Web1CAD uses a date-based versioning system:
- Format: `0.YYMMDD`
- Example: `0.250801` = Year 2025, Month 08, Day 01

## Build Information
- Build System: Automated via `build.sh`
- Production Build: Available in `build/` directory
- Release Packaging: Automated via `release.sh`
