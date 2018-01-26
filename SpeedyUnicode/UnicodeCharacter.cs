using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SpeedyUnicode
{
    public class UnicodeCharacter: IComparable<UnicodeCharacter>
    {
        /// <summary>
        /// Official Unicode name
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// User defined alias for easier lookup
        /// </summary>
        public string Alias { get; set; }

        /// <summary>
        /// Utf32 code
        /// </summary>
        public string Number { get; set; }

        /// <summary>
        /// Unicode character(s)
        /// </summary>
        public string Value { get; set; }

        public DateTime LastSelected { get; set; }

        public int FilterAccuracy { get; set; }

        public int CompareTo(UnicodeCharacter other)
        {
            // if dates equal, fall back to filter accuracy
            if (this.LastSelected == other.LastSelected)
            {
                return this.FilterAccuracy < other.FilterAccuracy ? 0 : 1;
            }

            return this.LastSelected > other.LastSelected ? 0 : 1;
        }
    }
}
