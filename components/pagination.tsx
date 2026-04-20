'use client';

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 0) return null

  const pages = []
  const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5

  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let endPage = Math.min(totalPages, startPage + maxVisible - 1)

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-4 mt-2">
      <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
        {/* Prev button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>

        {/* First page + ellipsis */}
        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
            >
              1
            </Button>
            {startPage > 2 && (
              <span className="text-muted-foreground text-xs sm:text-sm px-0.5">…</span>
            )}
          </>
        )}

        {/* Page number buttons */}
        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm ${
              currentPage === page ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white' : ''
            }`}
          >
            {page}
          </Button>
        ))}

        {/* Last page + ellipsis */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="text-muted-foreground text-xs sm:text-sm px-0.5">…</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
            >
              {totalPages}
            </Button>
          </>
        )}

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  )
}
