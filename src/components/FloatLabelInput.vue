<template>
    <div class="float-label">
        <input
            :id="label"
            v-model="localValue"
            @input="updateValue"
            @focus="isFocused = true"
            @blur="isFocused = false"
            :maxlength="maxLength || undefined"
            class="input-field"
        />
        <label
            :for="label"
            :class="['label', { 'float-active': isFocused || localValue }]"
        >
            {{ label }}
        </label>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
    modelValue: string | number | undefined;
    label: string;
    maxLength?: number;
    isNumber?: boolean;
}>();

const emits = defineEmits(["update:modelValue"]);

const localValue = ref<string | number | undefined>(props.modelValue);
const isFocused = ref(false);

function updateValue(event: Event) {
    const input = event.target as HTMLInputElement;
    if (props.isNumber) {
        const filteredValue = input.value.replace(/\D/g, "");
        localValue.value = filteredValue;
        emits("update:modelValue", filteredValue);
    } else {
        localValue.value = input.value;
        emits("update:modelValue", input.value);
    }
}
</script>

<style scoped>
.float-label {
    position: relative;
}

.label {
    position: absolute;
    top: 50%;
    left: 0.75rem;
    transform: translateY(-50%);
    transition: all 0.3s ease;
    pointer-events: none;
    color: #aaa;
    font-size: 1rem;
}

.float-active {
    top: -1.1rem;
    font-size: 0.75rem;

    color: #007ad9;
}

.input-field {
    padding: 0.75rem 0.75rem;
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid #ccc;
    font-size: 1.2rem;
    box-sizing: border-box;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-field:focus {
    border-color: #007ad9;
    box-shadow: 0 0 5px rgba(0, 122, 217, 0.2);
}

.input-field:focus + .label {
    top: -1.1rem;
    font-size: 0.75rem;
    color: #007ad9;
}

.input-field::placeholder {
    color: transparent;
}
</style>
