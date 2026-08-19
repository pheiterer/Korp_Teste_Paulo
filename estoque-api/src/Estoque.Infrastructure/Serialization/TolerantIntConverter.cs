using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Estoque.Infrastructure.Serialization;

/// <summary>
/// Conversor resiliente para inteiros que tolera números inteiros, decimais (2.0 -> 2) e strings ("2" -> 2).
/// </summary>
public class TolerantIntConverter : JsonConverter<int>
{
    public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number)
        {
            if (reader.TryGetInt32(out int value))
            {
                return value;
            }
            if (reader.TryGetInt64(out long lValue))
            {
                return (int)lValue;
            }
            if (reader.TryGetDouble(out double dValue))
            {
                return (int)Math.Round(dValue);
            }
            if (reader.TryGetDecimal(out decimal decValue))
            {
                return (int)Math.Round(decValue);
            }
        }
        else if (reader.TokenType == JsonTokenType.String)
        {
            var stringValue = reader.GetString();
            if (!string.IsNullOrEmpty(stringValue))
            {
                if (int.TryParse(stringValue, out int intVal))
                {
                    return intVal;
                }
                if (double.TryParse(stringValue, NumberStyles.Any, CultureInfo.InvariantCulture, out double dVal))
                {
                    return (int)Math.Round(dVal);
                }
            }
        }

        return 0;
    }

    public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
    {
        writer.WriteNumberValue(value);
    }
}
