package org.richfaces.renderkit.html;

import java.io.IOException;
import java.util.Collection;
import java.util.LinkedHashSet;

import org.ajax4jsf.javascript.ScriptUtils;
import org.richfaces.resource.ResourceKey;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Iterables;
import com.google.common.collect.Sets;
import com.google.common.collect.UnmodifiableIterator;

public class ClientOnlyScript extends ValidatorScriptBase {

    private static final ResourceKey CSV_RESOURCE = ResourceKey.create("csv.reslib", "org.richfaces");
    protected final LibraryScriptFunction converter;
    protected final ImmutableList<? extends LibraryScriptFunction> validators;
    private final ImmutableSet<ResourceKey> resources;

    public ClientOnlyScript(LibraryScriptFunction clientSideConverterScript,
        Collection<? extends LibraryScriptFunction> validatorScripts) {
        super();
        this.converter = clientSideConverterScript;
        this.validators = ImmutableList.copyOf(validatorScripts);
        LinkedHashSet<ResourceKey> resources = Sets.newLinkedHashSet();
        if (null != converter) {
            Iterables.addAll(resources, converter.getResources());
        }
        for (LibraryScriptFunction scriptString : validators) {
            Iterables.addAll(resources, scriptString.getResources());
        }
        resources.add(CSV_RESOURCE);
        this.resources = ImmutableSet.copyOf(resources);
    }

    public Iterable<ResourceKey> getResources() {
        return resources;
    }

    @Override
    protected void appendParameters(Appendable target) throws IOException {
        if (null != converter) {
            target.append(CONVERTER).append(":");
            appendConverter(target, converter);
            target.append(",");
        }
        target.append(VALIDATORS).append(":[");

        UnmodifiableIterator<? extends LibraryScriptFunction> iterator = validators.iterator();
        while (iterator.hasNext()) {
            LibraryScriptFunction validatorScript = (LibraryScriptFunction) iterator.next();
            appendValidator(target, validatorScript);
            if (iterator.hasNext()) {
                target.append(",");
            }
        }
        target.append("]");
        appendAjaxParameter(target);
    }

    protected void appendValidator(Appendable target, LibraryScriptFunction validatorScript) throws IOException {
        appendConverter(target, validatorScript);
    }

    protected void appendConverter(Appendable target, LibraryScriptFunction converter) throws IOException {
        target.append('{').append("f").append(':').append(converter.getName()).append(',');
        target.append(PARAMS).append(':');ScriptUtils.appendScript(target, converter.getParameters());
        target.append(',');
        target.append(MESSAGE).append(':');ScriptUtils.appendScript(target, converter.getMessage());
        target.append('}');
    }

    protected void appendAjaxParameter(Appendable target) throws IOException {
        // This is client-only validation script.
    }

    /*
     * (non-Javadoc)
     * 
     * @see java.lang.Object#hashCode()
     */
    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((converter == null) ? 0 : converter.hashCode());
        result = prime * result + ((validators == null) ? 0 : validators.hashCode());
        return result;
    }

    /*
     * (non-Javadoc)
     * 
     * @see java.lang.Object#equals(java.lang.Object)
     */
    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        ClientOnlyScript other = (ClientOnlyScript) obj;
        if (converter == null) {
            if (other.converter != null) {
                return false;
            }
        } else if (!converter.equals(other.converter)) {
            return false;
        }
        if (validators == null) {
            if (other.validators != null) {
                return false;
            }
        } else if (!validators.equals(other.validators)) {
            return false;
        }
        return true;
    }

}
